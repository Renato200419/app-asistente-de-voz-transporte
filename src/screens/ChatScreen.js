import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';

// Configuración de Gemini AI
const GEMINI_API_KEY = 'AIzaSyDt7xInKNqzTfeMYDtN91Kpm9I7NWuQyog';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_VISION_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState(null);
  const [preferences, setPreferences] = useState({
    voiceAlerts: true,
    hapticFeedback: false,
    visualNotifications: true,
    detailLevel: 'medium',
    extraTime: 5
  });

  useEffect(() => {
    loadUserConfig();
    initializeChat();
  }, []);

  const loadUserConfig = async () => {
    try {
      const config = await AsyncStorage.getItem('userConfig');
      if (config) {
        const parsedConfig = JSON.parse(config);
        setUserType(parsedConfig.type);
        if (parsedConfig.preferences) {
          setPreferences(parsedConfig.preferences);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const initializeChat = () => {
    const welcomeMessage = {
      id: 1,
      text: "¡Hola! Soy tu asistente inteligente de transporte potenciado por IA. Puedo ayudarte con:\n\n• Información sobre rutas y horarios\n• Análisis de fotos para detectar problemas de accesibilidad\n• Navegación paso a paso\n• Reportes de problemas en tiempo real\n\n¿En qué puedo ayudarte?",
      isBot: true,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    
    if (userType === 'visual' && preferences.voiceAlerts) {
      Speech.speak(welcomeMessage.text, { language: 'es' });
    }
  };

  // Función para llamar a Gemini AI
  const callGeminiAI = async (message, imageBase64 = null) => {
    try {
      const systemPrompt = `Eres un asistente especializado en transporte público y accesibilidad para personas con discapacidades. 
      Tu conocimiento incluye:
      - Rutas de transporte público (Metro, buses, Metropolitano)
      - Horarios de servicio
      - Información de accesibilidad (ascensores, rampas, señalización)
      - Tarifas y descuentos
      - Asistencia para personas con discapacidad visual, movilidad reducida y adultos mayores
      
      Proporciona respuestas claras, concisas y útiles. Si recibes una imagen, analízala para identificar:
      - Señalización de transporte
      - Problemas de accesibilidad
      - Obstáculos o barreras
      - Información relevante para la navegación
      
      Siempre responde en español y de manera empática.`;

      let apiUrl = GEMINI_API_URL;
      let requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUsuario: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1024,
        }
      };

      // Si hay imagen, usar el modelo de visión
      if (imageBase64) {
        apiUrl = GEMINI_VISION_API_URL;
        requestBody.contents[0].parts = [
          {
            text: `${systemPrompt}\n\nAnaliza esta imagen del transporte público y responde: ${message}`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          }
        ];
      }

      const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Respuesta inesperada de la API');
      }
      
    } catch (error) {
      console.error('Error calling Gemini AI:', error);
      
      // Fallback con información básica si falla la API
      return `Lo siento, estoy teniendo problemas para conectarme con el servicio de IA. 

Aquí está la información básica que puedo proporcionarte:

📍 Rutas principales: Línea 1 del Metro, Metropolitano, Buses urbanos
⏰ Horarios: Metro (6:00-23:00), Buses (5:30-23:30)
♿ Accesibilidad: Estaciones con ascensores y rampas disponibles
💰 Tarifas: Metro S/1.50, Bus S/1.00, Metropolitano S/2.50

¿Necesitas información específica sobre algún tema?`;
    }
  };

  const sendMessage = async () => {
    if (inputText.trim()) {
      const userMessage = {
        id: Date.now(),
        text: inputText,
        isBot: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setIsLoading(true);

      try {
        // Llamar a Gemini AI
        const botResponseText = await callGeminiAI(inputText);
        
        const botResponse = {
          id: Date.now() + 1,
          text: botResponseText,
          isBot: true,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botResponse]);

        if (userType === 'visual' && preferences.voiceAlerts) {
          Speech.speak(botResponseText, { language: 'es' });
        }
      } catch (error) {
        console.error('Error en sendMessage:', error);
        const errorResponse = {
          id: Date.now() + 1,
          text: "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Necesitamos permisos de cámara para esta función');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true
    });

    if (!result.canceled) {
      const imageMessage = {
        id: Date.now(),
        text: "📷 Foto tomada para analizar",
        image: result.assets[0].uri,
        isBot: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, imageMessage]);
      setIsLoading(true);

      try {
        const analysis = await callGeminiAI(
          "Analiza esta imagen y proporciona información relevante sobre accesibilidad, señalización, rutas o cualquier aspecto importante para personas con discapacidad en el transporte público.",
          result.assets[0].base64
        );

        const botResponse = {
          id: Date.now() + 1,
          text: analysis,
          isBot: true,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botResponse]);

        if (userType === 'visual' && preferences.voiceAlerts) {
          Speech.speak(analysis, { language: 'es' });
        }
      } catch (error) {
        console.error('Error analizando imagen:', error);
        const errorResponse = {
          id: Date.now() + 1,
          text: "Lo siento, no pude analizar la imagen. Por favor, intenta de nuevo o describe lo que necesitas saber.",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const selectFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true
    });

    if (!result.canceled) {
      const imageMessage = {
        id: Date.now(),
        text: "🖼️ Imagen seleccionada para analizar",
        image: result.assets[0].uri,
        isBot: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, imageMessage]);
      setIsLoading(true);

      try {
        const analysis = await callGeminiAI(
          "Analiza esta imagen y proporciona información relevante sobre accesibilidad, señalización, rutas o cualquier aspecto importante para personas con discapacidad en el transporte público.",
          result.assets[0].base64
        );

        const botResponse = {
          id: Date.now() + 1,
          text: analysis,
          isBot: true,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botResponse]);

        if (userType === 'visual' && preferences.voiceAlerts) {
          Speech.speak(analysis, { language: 'es' });
        }
      } catch (error) {
        console.error('Error analizando imagen:', error);
        const errorResponse = {
          id: Date.now() + 1,
          text: "Lo siento, no pude analizar la imagen. Por favor, intenta de nuevo.",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const simulateVoiceInput = () => {
    setIsListening(true);
    
    setTimeout(() => {
      const exampleQueries = [
        "¿Cuáles son las rutas accesibles para sillas de ruedas?",
        "¿Hay ascensores funcionando en la Estación Central?",
        "¿Cuál es el horario del Metro hoy?",
        "Necesito ir al aeropuerto, ¿qué ruta me recomiendas?",
        "¿Hay descuentos para personas con discapacidad?"
      ];
      
      const randomQuery = exampleQueries[Math.floor(Math.random() * exampleQueries.length)];
      setInputText(randomQuery);
      setIsListening(false);
    }, 2000);
  };

  const getMessageStyle = () => {
    const baseStyle = userType === 'elderly' ? styles.largeText : styles.normalText;
    if (userType === 'visual') {
      return [baseStyle, styles.whiteText];
    }
    return baseStyle;
  };

  const getInputContainerStyle = () => {
    const baseStyle = styles.inputContainer;
    if (userType === 'visual') {
      return [baseStyle, styles.darkInputContainer];
    }
    return baseStyle;
  };

  const getBubbleStyle = (isBot) => {
    const baseStyle = [
      styles.messageBubble,
      isBot ? styles.botMessage : styles.userMessage
    ];
    
    if (userType === 'elderly') {
      baseStyle.push(styles.largeBubble);
    }
    
    if (userType === 'visual' && isBot) {
      baseStyle.push(styles.darkBotMessage);
    }
    
    return baseStyle;
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, userType === 'visual' && styles.darkTheme]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      <View style={[styles.header, userType === 'visual' && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons 
            name="arrow-back" 
            size={userType === 'elderly' ? 28 : 24} 
            color={userType === 'visual' ? '#fff' : '#333'} 
          />
        </TouchableOpacity>
        <Text style={[
          styles.title, 
          userType === 'visual' && styles.whiteText,
          userType === 'elderly' && styles.largeTitle
        ]}>
          Asistente IA 🤖
        </Text>
        <View style={styles.geminiIndicator}>
          <Text style={styles.geminiText}>Gemini AI</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(message => (
          <View 
            key={message.id} 
            style={getBubbleStyle(message.isBot)}
          >
            <Text style={[getMessageStyle(), message.isBot && styles.botText]}>
              {message.text}
            </Text>
            {message.image && (
              <Image source={{ uri: message.image }} style={styles.messageImage} />
            )}
            <Text style={[
              styles.timestamp,
              userType === 'visual' && styles.whiteTimestamp,
              userType === 'elderly' && styles.largeTimestamp
            ]}>
              {message.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={[styles.messageBubble, styles.botMessage, styles.loadingBubble]}>
            <ActivityIndicator size="small" color="#4caf50" />
            <Text style={[styles.normalText, { marginLeft: 10 }]}>
              Pensando...
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={getInputContainerStyle()}>
        <TextInput
          style={[
            styles.textInput,
            userType === 'elderly' && styles.largeInput,
            userType === 'visual' && styles.darkInput
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor={userType === 'visual' ? '#ccc' : '#999'}
          multiline
          numberOfLines={userType === 'elderly' ? 3 : 2}
          maxLength={500}
          editable={!isLoading}
        />
        
        <TouchableOpacity 
          style={[
            styles.galleryButton,
            userType === 'elderly' && styles.largeButton
          ]}
          onPress={selectFromGallery}
          disabled={isLoading}
          accessibilityLabel="Seleccionar imagen"
          accessibilityHint="Toca para seleccionar una imagen de tu galería"
        >
          <Ionicons 
            name="image" 
            size={userType === 'elderly' ? 28 : 24} 
            color="white" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.cameraButton,
            userType === 'elderly' && styles.largeButton
          ]}
          onPress={takePhoto}
          disabled={isLoading}
          accessibilityLabel="Tomar foto"
          accessibilityHint="Toca para tomar una foto y analizarla"
        >
          <Ionicons 
            name="camera" 
            size={userType === 'elderly' ? 28 : 24} 
            color="white" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.voiceButton,
            isListening && styles.listeningButton,
            userType === 'elderly' && styles.largeButton
          ]}
          onPress={simulateVoiceInput}
          disabled={isLoading}
          accessibilityLabel="Botón de voz"
          accessibilityHint="Toca para hablar tu consulta"
        >
          <Ionicons 
            name={isListening ? "radio-button-on" : "mic"} 
            size={userType === 'elderly' ? 28 : 24} 
            color="white" 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.sendButton,
            userType === 'elderly' && styles.largeButton,
            (!inputText.trim() || isLoading) && styles.disabledButton
          ]} 
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
          accessibilityLabel="Enviar mensaje"
          accessibilityHint="Toca para enviar tu consulta"
        >
          <Ionicons 
            name="send" 
            size={userType === 'elderly' ? 28 : 24} 
            color="white" 
          />
        </TouchableOpacity>
      </View>

      {isListening && (
        <View style={[
          styles.listeningIndicator,
          userType === 'elderly' && styles.largeListeningIndicator
        ]}>
          <Text style={[
            styles.listeningText,
            userType === 'elderly' && styles.largeListeningText
          ]}>
            🎤 Escuchando...
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  darkTheme: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  darkHeader: {
    borderBottomColor: '#444',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333',
    flex: 1,
  },
  largeTitle: {
    fontSize: 24,
  },
  whiteText: {
    color: '#fff',
  },
  geminiIndicator: {
    backgroundColor: '#4285f4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  geminiText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageBubble: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: '80%',
  },
  largeBubble: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
  },
  userMessage: {
    backgroundColor: '#2196f3',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#e8f5e8',
    alignSelf: 'flex-start',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkBotMessage: {
    backgroundColor: '#2d2d2d',
  },
  normalText: {
    fontSize: 16,
    color: '#333',
  },
  largeText: {
    fontSize: 20,
    color: '#333',
    lineHeight: 26,
  },
  botText: {
    color: '#2e7d32',
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  largeTimestamp: {
    fontSize: 14,
  },
  whiteTimestamp: {
    color: '#bbb',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  darkInputContainer: {
    backgroundColor: '#1e1e1e',
    borderTopColor: '#444',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    minHeight: 40,
  },
  largeInput: {
    fontSize: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    minHeight: 50,
    borderRadius: 25,
  },
  darkInput: {
    backgroundColor: '#333',
    borderColor: '#555',
    color: '#fff',
  },
  galleryButton: {
    backgroundColor: '#8e24aa',
    borderRadius: 25,
    padding: 12,
    marginRight: 5,
    minWidth: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    backgroundColor: '#9c27b0',
    borderRadius: 25,
    padding: 12,
    marginRight: 5,
    minWidth: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    backgroundColor: '#4caf50',
    borderRadius: 25,
    padding: 12,
    marginRight: 5,
    minWidth: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningButton: {
    backgroundColor: '#f44336',
  },
  sendButton: {
    backgroundColor: '#2196f3',
    borderRadius: 25,
    padding: 12,
    minWidth: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  largeButton: {
    padding: 16,
    minWidth: 60,
    minHeight: 60,
    borderRadius: 30,
  },
  listeningIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  largeListeningIndicator: {
    padding: 20,
    borderRadius: 15,
  },
  listeningText: {
    color: 'white',
    fontSize: 16,
  },
  largeListeningText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ChatScreen;