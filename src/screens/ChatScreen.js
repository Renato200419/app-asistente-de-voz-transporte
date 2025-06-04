import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    loadUserConfig();
    initializeChat();
  }, []);

  const loadUserConfig = async () => {
    try {
      const config = await AsyncStorage.getItem('userConfig');
      if (config) {
        setUserType(JSON.parse(config).type);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const initializeChat = () => {
    const welcomeMessage = {
      id: 1,
      text: "¡Hola! Soy tu asistente de transporte. Puedo ayudarte con información sobre rutas, horarios, accesibilidad y más. ¿En qué puedo ayudarte?",
      isBot: true,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    
    // Reproducir mensaje de bienvenida para usuarios con discapacidad visual
    if (userType === 'visual') {
      Speech.speak(welcomeMessage.text, { language: 'es' });
    }
  };

  const transportKnowledgeBase = {
    // Información sobre rutas
    'rutas': [
      "Tenemos información sobre las principales líneas de transporte público.",
      "Las rutas más populares incluyen la Línea 1 del Metro, buses urbanos y el Metropolitano.",
      "¿Te interesa alguna ruta específica?"
    ],
    'horarios': [
      "Los horarios del transporte público varían según la línea:",
      "• Metro: 6:00 AM - 11:00 PM",
      "• Buses urbanos: 5:30 AM - 11:30 PM", 
      "• Metropolitano: 5:00 AM - 11:00 PM",
      "¿Necesitas el horario de alguna línea específica?"
    ],
    'accesibilidad': [
      "Información de accesibilidad disponible:",
      "• Estaciones con ascensores",
      "• Rutas con acceso para sillas de ruedas",
      "• Buses con piso bajo",
      "• Señalización en braille",
      "¿Qué tipo de accesibilidad necesitas?"
    ],
    'precios': [
      "Tarifas actuales del transporte público:",
      "• Metro: S/. 1.50",
      "• Bus urbano: S/. 1.00",
      "• Metropolitano: S/. 2.50",
      "• Tarjeta universitaria: 50% descuento",
      "¿Necesitas información sobre descuentos?"
    ],
    'estaciones': [
      "Información sobre estaciones principales:",
      "• Estación Central: Acceso completo para sillas de ruedas",
      "• Plaza Norte: Ascensores y señalización táctil",
      "• Aeropuerto: Servicios especializados de asistencia",
      "¿Qué estación te interesa?"
    ]
  };

  const processMessage = (text) => {
    const lowerText = text.toLowerCase();
    let response = "No encuentro información específica sobre eso. ¿Puedes ser más específico? Puedo ayudarte con rutas, horarios, accesibilidad, precios o estaciones.";

    // Búsqueda en base de conocimiento
    for (const [key, responses] of Object.entries(transportKnowledgeBase)) {
      if (lowerText.includes(key) || 
          (key === 'rutas' && (lowerText.includes('ruta') || lowerText.includes('línea'))) ||
          (key === 'horarios' && (lowerText.includes('horario') || lowerText.includes('hora'))) ||
          (key === 'precios' && (lowerText.includes('precio') || lowerText.includes('tarifa') || lowerText.includes('costo'))) ||
          (key === 'estaciones' && (lowerText.includes('estación') || lowerText.includes('parada')))) {
        response = Array.isArray(responses) ? responses.join('\n') : responses;
        break;
      }
    }

    // Respuestas específicas por tipo de usuario
    if (userType === 'visual' && lowerText.includes('visual')) {
      response = "Para usuarios con discapacidad visual ofrecemos:\n• Anuncios de voz en todas las estaciones\n• Señalización en braille\n• Asistencia personalizada\n• Aplicación con comandos de voz";
    } else if (userType === 'motor' && (lowerText.includes('silla') || lowerText.includes('acceso'))) {
      response = "Para usuarios con movilidad reducida:\n• 85% de estaciones tienen ascensores\n• Buses con piso bajo\n• Espacios reservados\n• Rampas de acceso\n• Asistencia en transbordos";
    } else if (userType === 'elderly' && (lowerText.includes('mayor') || lowerText.includes('tiempo'))) {
      response = "Para adultos mayores:\n• Asientos preferenciales\n• Tiempo extra en transbordos\n• Asistencia personalizada\n• Descuentos especiales\n• Información simplificada";
    }

    // Saludos y consultas generales
    if (lowerText.includes('hola') || lowerText.includes('ayuda')) {
      response = "¡Hola! Estoy aquí para ayudarte con el transporte público. Puedo informarte sobre rutas, horarios, accesibilidad, precios y estaciones. ¿Qué necesitas saber?";
    }

    return response;
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      const userMessage = {
        id: Date.now(),
        text: inputText,
        isBot: false,
        timestamp: new Date()
      };

      const botResponse = {
        id: Date.now() + 1,
        text: processMessage(inputText),
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage, botResponse]);
      setInputText('');

      // Reproducir respuesta para usuarios con discapacidad visual
      if (userType === 'visual') {
        Speech.speak(botResponse.text, { language: 'es' });
      }
    }
  };

  const simulateVoiceInput = () => {
    setIsListening(true);
    
    // Simulación de reconocimiento de voz
    setTimeout(() => {
      const exampleQueries = [
        "¿Qué rutas hay disponibles?",
        "¿Cuáles son los horarios del metro?",
        "¿Hay accesibilidad para sillas de ruedas?",
        "¿Cuánto cuesta el pasaje?",
        "¿Dónde está la estación más cercana?"
      ];
      
      const randomQuery = exampleQueries[Math.floor(Math.random() * exampleQueries.length)];
      setInputText(randomQuery);
      setIsListening(false);
    }, 2000);
  };

  const getMessageStyle = () => {
    return userType === 'elderly' ? styles.largeText : styles.normalText;
  };

  return (
    <View style={[styles.container, userType === 'visual' && styles.darkTheme]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={userType === 'visual' ? '#fff' : '#333'} 
          />
        </TouchableOpacity>
        <Text style={[styles.title, userType === 'visual' && styles.whiteText]}>
          Asistente de Transporte
        </Text>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {messages.map(message => (
          <View 
            key={message.id} 
            style={[
              styles.messageBubble,
              message.isBot ? styles.botMessage : styles.userMessage
            ]}
          >
            <Text style={[getMessageStyle(), message.isBot && styles.botText]}>
              {message.text}
            </Text>
            <Text style={styles.timestamp}>
              {message.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            userType === 'elderly' && styles.largeInput,
            userType === 'visual' && styles.darkInput
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu consulta sobre transporte..."
          placeholderTextColor={userType === 'visual' ? '#ccc' : '#999'}
          multiline
        />
        
        <TouchableOpacity 
          style={[
            styles.voiceButton,
            isListening && styles.listeningButton
          ]}
          onPress={simulateVoiceInput}
        >
          <Ionicons 
            name={isListening ? "radio-button-on" : "mic"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {isListening && (
        <View style={styles.listeningIndicator}>
          <Text style={styles.listeningText}>🎤 Escuchando...</Text>
        </View>
      )}
    </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333',
  },
  whiteText: {
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messageBubble: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#2196f3',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#e8f5e8',
    alignSelf: 'flex-start',
  },
  normalText: {
    fontSize: 16,
    color: '#333',
  },
  largeText: {
    fontSize: 18,
    color: '#333',
  },
  botText: {
    color: '#2e7d32',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    alignItems: 'flex-end',
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
  },
  largeInput: {
    fontSize: 18,
    paddingVertical: 15,
  },
  darkInput: {
    backgroundColor: '#333',
    borderColor: '#555',
    color: '#fff',
  },
  voiceButton: {
    backgroundColor: '#4caf50',
    borderRadius: 25,
    padding: 12,
    marginRight: 5,
  },
  listeningButton: {
    backgroundColor: '#f44336',
  },
  sendButton: {
    backgroundColor: '#2196f3',
    borderRadius: 25,
    padding: 12,
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
  listeningText: {
    color: 'white',
    fontSize: 16,
  },
});

export default ChatScreen;