import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import Voice from '@react-native-voice/voice';
import { PermissionsAndroid, Vibration } from 'react-native';
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
  ActivityIndicator,
  useSafeAreaInsets,
  Keyboard
} from 'react-native';
import { useSafeAreaInsets as useSafeAreaInsetsSafe } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';

// Configuración de Gemini AI
const GEMINI_API_KEY = 'AIzaSyAv9ReoM5Bd0OjXdAsB-lhJzKgiTNUE_Hw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_VISION_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Componente para renderizar texto con formato simple (negrita, listas, saltos de línea)
function FormattedText({ text }) {
  // Reemplaza **negrita** por <Text style={...}>
  const parseBold = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        return <Text key={i} style={{ fontWeight: 'bold', color: '#1976d2' }}>{part.replace(/\*\*/g, '')}</Text>;
      }
      return part;
    });
  };
  // Soporte para listas y saltos de línea
  const lines = text.split(/\n|\r\n/);
  return (
    <View>
      {lines.map((line, idx) => {
        if (/^\s*[-•*]\s+/.test(line)) {
          // Lista
          return <Text key={idx} style={{ marginLeft: 16, color: '#333' }}>• {parseBold(line.replace(/^\s*[-•*]\s+/, ''))}</Text>;
        }
        return <Text key={idx} style={{ color: '#333' }}>{parseBold(line)}</Text>;
      })}
    </View>
  );
}

const ChatScreen = ({ navigation, route }) => {
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
  const [voiceError, setVoiceError] = useState(null);
  const insets = useSafeAreaInsetsSafe();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [asistenciaContexto, setAsistenciaContexto] = useState(route?.params?.asistenciaContexto || null);
  // Estado para previsualización de imagen antes de enviar
  const [pendingImage, setPendingImage] = useState(null);
  // Banner visual para notificaciones
  const [visualBanner, setVisualBanner] = useState(null);

  useEffect(() => {
    loadUserConfig();
    // Si hay contexto de asistencia, mostrarlo como mensaje inicial y guardarlo en estado
    if (route && route.params && route.params.asistenciaContexto) {
      setAsistenciaContexto(route.params.asistenciaContexto);
      // Mensaje proactivo personalizado según el contexto
      let mensajeBot = '';
      if (route.params.asistenciaContexto.includes('planificar un viaje')) {
        mensajeBot = '¡Hola! Veo que necesitas ayuda para planificar tu viaje en la app. Te guiaré paso a paso sobre cómo usar la interfaz: primero, ingresa el origen tocando el campo correspondiente o usa el botón de mapa; luego, ingresa el destino y pulsa "Buscar Ruta". Si tienes dudas sobre algún botón o campo, dime cuál y te explico para qué sirve.';
      } else {
        mensajeBot = '¡Hola! Veo que necesitas asistencia durante tu viaje. ¿Quieres que te ayude con el siguiente paso, resolver dudas sobre la ruta, o reportar algún problema?';
      }
      const botMessage = {
        id: Date.now(),
        text: mensajeBot,
        isBot: true,
        timestamp: new Date()
      };
      setMessages([botMessage]);
      if (preferences.voiceAlerts) {
        Speech.speak(mensajeBot, { language: 'es' });
      }
    } else {
      setAsistenciaContexto(null);
      initializeChat();
    }
    setupVoiceRecognition();
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      Voice.destroy().then(() => Voice.removeAllListeners());
      showSub.remove();
      hideSub.remove();
    };
  }, [route && route.params && route.params.asistenciaContexto]);

  const setupVoiceRecognition = () => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
  };

  const onSpeechStart = (e) => {
    console.log('onSpeechStart', e);
    setIsListening(true);
  };

  const onSpeechEnd = (e) => {
    console.log('onSpeechEnd', e);
    setIsListening(false);
  };

  const onSpeechError = (e) => {
    console.log('onSpeechError', e);
    setVoiceError(e.error?.message || 'Error de voz');
    setIsListening(false);
    if (preferences.visualNotifications) setVisualBanner(e.error?.message || 'Error de voz');
  };

  const onSpeechResults = (e) => {
    console.log('onSpeechResults', e);
    if (e.value?.length) setInputText(e.value[0]);
  };

  const onSpeechPartialResults = (e) => {
    console.log('onSpeechPartialResults', e);
    if (e.value?.length) setInputText(e.value[0]);
  };

  const startVoiceRecognition = async () => {
    try {
      console.log('Solicitando permiso de micrófono...');
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de micrófono',
            message: 'La aplicación necesita acceder al micrófono para reconocimiento de voz.'
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permiso de micrófono denegado');
          setVoiceError('Permiso de micrófono denegado');
          return;
        }
      }
      console.log('Iniciando reconocimiento de voz');
      setVoiceError(null);
      await Voice.start('es-ES');
    } catch (e) {
      console.log('Error startVoiceRecognition', e);
      setVoiceError(e.message);
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      console.log('Deteniendo reconocimiento de voz');
      await Voice.stop();
    } catch (e) {
      console.log('Error stopVoiceRecognition', e);
    }
  };

  // Simulación de voz: muestra animación y luego inserta texto predeterminado
  const simulateVoiceInput = () => {
    const fakeText = "¿Puedes ayudarme con información sobre rutas y horarios de transporte?";
    // Mostrar indicador de escucha
    setIsListening(true);
    // Tras 1.5s, insertar texto y ocultar indicador
    setTimeout(() => {
      setInputText(fakeText);
      setIsListening(false);
    }, 1500);
  };

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
    // Solo mostrar mensaje de bienvenida si NO hay contexto de asistencia
    if (asistenciaContexto) return;
    const welcomeMessage = {
      id: 1,
      text: "¡Hola! Soy tu asistente inteligente de transporte potenciado por IA. Puedo ayudarte con:\n\n• Información sobre rutas y horarios\n• Análisis de fotos para detectar problemas de accesibilidad\n• Navegación paso a paso\n• Reportes de problemas en tiempo real\n\n¿En qué puedo ayudarte?",
      isBot: true,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    if (preferences.voiceAlerts) {
      Speech.speak(welcomeMessage.text, { language: 'es' });
    }
  };

  // Incluir el contexto en cada consulta a la IA
  const callGeminiAI = async (message, imageBase64 = null, detailLevel = 'medium') => {
    try {
      let contexto = asistenciaContexto ? `\n\n[Contexto del viaje]: ${asistenciaContexto}` : '';
      let systemPrompt = '';
      if (asistenciaContexto && asistenciaContexto.includes('planificar un viaje')) {
        systemPrompt = `Eres un asistente de accesibilidad para una app de transporte. SOLO debes dar instrucciones sobre cómo usar la interfaz de la app para planificar un viaje.\n\nDESCRIPCIÓN DE LA INTERFAZ:\n- Hay un campo de texto para ingresar el ORIGEN (puede ser una dirección o estación).\n- Hay un botón de mapa junto al campo de origen para seleccionar el punto en el mapa.\n- Hay un campo de texto para ingresar el DESTINO.\n- Hay un botón de mapa junto al campo de destino para seleccionar el punto en el mapa.\n- Hay un botón que dice 'Buscar Ruta' para calcular la mejor ruta.\n- Hay un botón para guardar el destino como favorito.\n- Debajo, se muestra el historial de viajes recientes.\n- Cuando se muestra una ruta, aparecen los pasos, un mapa, y botones para avanzar, retroceder o cancelar el viaje.\n- NO puedes crear rutas, ni modificar la interfaz, ni inventar funciones que la app no tiene.\n\nGuía al usuario paso a paso sobre cómo usar estos elementos. Siempre responde en español, de forma clara y empática.`;
      } else {
        systemPrompt = `Eres un asistente especializado en transporte público y accesibilidad para personas con discapacidades. 
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
      
      Siempre responde en español y de manera empática.
      ${detailLevel === 'high' ? 'Da respuestas detalladas, con ejemplos y pasos claros.' : ''}`;
      }
      let requestBody = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUsuario: ${message}${contexto}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      // Si hay imagen, agregar al mismo modelo
      if (imageBase64) {
        requestBody.contents[0].parts = [
          {
            text: `${systemPrompt}\n\nAnaliza esta imagen del transporte público y responde: ${message}${contexto}`
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          }
        ];
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Details:', errorData);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.error('Unexpected API response:', data);
        throw new Error('Respuesta inesperada de la API');
      }
      
    } catch (error) {
      console.error('Error calling Gemini AI:', error);
      
      // Fallback con información básica si falla la API
      return `Lo siento, estoy teniendo problemas para conectarme con el servicio de IA. \n\nAquí está la información básica que puedo proporcionarte:\n\n📍 Rutas principales: Línea 1 del Metro, Metropolitano, Buses urbanos\n⏰ Horarios: Metro (6:00-23:00), Buses (5:30-23:30)\n♿ Accesibilidad: Estaciones con ascensores y rampas disponibles\n💰 Tarifas: Metro S/1.50, Bus S/1.00, Metropolitano S/2.50`;
    }
  };

  const vibrateIfEnabled = () => {
    if (userType && preferences && preferences.hapticFeedback) {
      Vibration.vibrate(50);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) {
      vibrateIfEnabled();
      Alert.alert('Campo vacío', 'Por favor escribe tu mensaje antes de enviar.');
      if (preferences.visualNotifications) setVisualBanner('Por favor escribe tu mensaje antes de enviar.');
      return;
    }
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
      const botResponseText = await callGeminiAI(inputText, null, preferences.detailLevel);
      const botResponse = {
        id: Date.now() + 1,
        text: botResponseText,
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      if (preferences.voiceAlerts) {
        Speech.speak(botResponseText, { language: 'es' });
      }
    } catch (error) {
      vibrateIfEnabled();
      const errorResponse = {
        id: Date.now() + 1,
        text: "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      if (preferences.visualNotifications) setVisualBanner('Error al procesar tu mensaje.');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      // Verificar permisos de cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos permisos de cámara para esta función. Por favor, ve a configuración y habilita el acceso a la cámara.');
        return;
      }      // Lanzar la cámara
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPendingImage({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64
        });
      }
    } catch (error) {
      console.error('Error abriendo cámara:', error);
      Alert.alert('Error', 'No se pudo abrir la cámara. Asegúrate de que tienes una cámara disponible y permisos habilitados.');
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
      setPendingImage({
        uri: result.assets[0].uri,
        base64: result.assets[0].base64
      });
    }
  };

  // Enviar imagen con contexto
  const sendPendingImage = async () => {
    if (!pendingImage) return;
    if (!inputText.trim()) {
      vibrateIfEnabled();
      Alert.alert('Campo vacío', 'Por favor escribe un mensaje de contexto para la imagen.');
      if (preferences.visualNotifications) setVisualBanner('Por favor escribe un mensaje de contexto para la imagen.');
      return;
    }
    const imageMessage = {
      id: Date.now(),
      text: inputText,
      image: pendingImage.uri,
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, imageMessage]);
    setInputText('');
    setIsLoading(true);
    setPendingImage(null);
    try {
      const analysis = await callGeminiAI(inputText, pendingImage.base64, preferences.detailLevel);
      const botResponse = {
        id: Date.now() + 1,
        text: analysis,
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      if (preferences.voiceAlerts) {
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
      if (preferences.visualNotifications) setVisualBanner('Error al analizar la imagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = () => {
    setIsListening(true);
    
    // Simular el proceso de escucha
    setTimeout(() => {
      setIsListening(false);
      promptForVoiceInput();
    }, 1500);
    
    // Dar feedback de voz
    if (preferences.voiceAlerts) {
      Speech.speak("Selecciona una opción del menú que aparecerá", { language: 'es' });
    }
  };

  const getMessageStyle = () => {
    if (userType === 'elderly') return [styles.largeText];
    if (userType === 'visual') return [styles.normalText, { color: '#fff' }];
    return styles.normalText;
  };

  const getInputContainerStyle = () => {
    if (userType === 'visual') return [styles.inputContainer, { backgroundColor: '#1e1e1e', borderTopColor: '#444' }];
    return styles.inputContainer;
  };

  const getBubbleStyle = (isBot) => {
    let base = [styles.messageBubble, isBot ? styles.botMessage : styles.userMessage];
    if (userType === 'elderly') base.push(styles.largeBubble);
    if (userType === 'visual' && isBot) base.push({ backgroundColor: '#2d2d2d' });
    return base;
  };

  const getTextInputStyle = () => {
    let base = [styles.textInput];
    if (userType === 'elderly') base.push(styles.largeInput);
    if (userType === 'visual') base.push({ backgroundColor: '#333', borderColor: '#555', color: '#fff' });
    return base;
  };

  const getTimestampStyle = () => {
    let base = [styles.timestamp];
    if (userType === 'visual') base.push({ color: '#bbb' });
    if (userType === 'elderly') base.push(styles.largeTimestamp);
    return base;
  };

  // Banner visual
  const renderVisualBanner = () => visualBanner ? (
    <View style={{ backgroundColor: '#fff3cd', borderLeftWidth: 6, borderLeftColor: '#ff9800', padding: 12, margin: 16, borderRadius: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 }}>
      <Ionicons name="alert-circle" size={22} color="#ff9800" style={{ marginRight: 8 }} />
      <Text style={{ color: '#8a6d3b', fontWeight: 'bold', flex: 1 }}>{visualBanner}</Text>
      <TouchableOpacity onPress={() => setVisualBanner(null)} accessibilityLabel="Cerrar alerta visual">
        <Ionicons name="close" size={22} color="#ff9800" />
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView 
      style={[
        styles.container,
        userType === 'visual' && { backgroundColor: '#121212' },
        { paddingBottom: !keyboardVisible ? (insets.bottom || 0) : 0 }
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
    >
      {renderVisualBanner()}
      {/* Indicador visual de contexto de asistencia */}
      {asistenciaContexto && (
        <View style={styles.contextIndicator}>
          <Ionicons name="information-circle" size={20} color="#1976d2" style={{ marginRight: 8 }} />
          <Text style={styles.contextIndicatorText} numberOfLines={3}>
            <Text style={{ fontWeight: 'bold' }}>Contexto actual: </Text>{asistenciaContexto}
          </Text>
        </View>
      )}
      <View style={[styles.header, userType === 'visual' && { borderBottomColor: '#444' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons 
            name="arrow-back" 
            size={userType === 'elderly' ? 28 : 24} 
            color={userType === 'visual' ? '#fff' : '#333'} 
          />
        </TouchableOpacity>
        <Text style={[
          styles.title, 
          userType === 'visual' && { color: '#fff' },
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
        {messages.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#888', fontSize: 18, textAlign: 'center' }}>
              ¡No hay mensajes aún!
            </Text>
            <Text style={{ color: '#bbb', fontSize: 15, marginTop: 8, textAlign: 'center' }}>
              Escribe tu consulta o usa el micrófono para comenzar a interactuar con el asistente.
            </Text>
          </View>
        ) : (
          messages.map(message => (
            <View 
              key={message.id} 
              style={getBubbleStyle(message.isBot)}
            >
              {message.image && (
                <Image 
                  source={{ uri: message.image }} 
                  style={styles.chatImage} 
                  resizeMode="cover"
                  accessible accessibilityLabel="Imagen enviada"
                />
              )}
              <FormattedText text={message.text} />
              <Text style={getTimestampStyle()}>
                {message.timestamp.toLocaleTimeString()}
              </Text>
            </View>
          ))
        )}
        {isLoading && (
          <View style={[styles.messageBubble, styles.botMessage, styles.loadingBubble]}>
            <ActivityIndicator size="small" color="#4caf50" />
            <Text style={[styles.normalText, { marginLeft: 10 }]}>Pensando...</Text>
          </View>
        )}
      </ScrollView>

      <View style={getInputContainerStyle()}>
        {pendingImage ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: pendingImage.uri }} style={{ width: 54, height: 54, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#1976d2' }} />
            <TextInput
              style={[getTextInputStyle(), { flex: 1, marginRight: 8 }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Describe el problema, lugar o contexto de la foto..."
              placeholderTextColor={userType === 'visual' ? '#ccc' : '#999'}
              multiline
              numberOfLines={2}
              maxLength={300}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.disabledButton]}
              onPress={sendPendingImage}
              disabled={!inputText.trim() || isLoading}
              accessibilityLabel="Enviar imagen"
              accessibilityHint="Toca para enviar la imagen y el mensaje de contexto"
            >
              <Ionicons name="send" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { marginLeft: 6 }]}
              onPress={() => { setPendingImage(null); setInputText(''); }}
              accessibilityLabel="Cancelar imagen"
              accessibilityHint="Toca para cancelar el envío de la imagen"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={getTextInputStyle()}
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
              accessibilityLabel={isListening ? "Detener grabación de voz" : "Iniciar grabación de voz"}
              accessibilityHint={isListening ? "Toca para detener la grabación de voz" : "Toca para iniciar la grabación de voz"}
            >
              <Ionicons 
                name={isListening ? "stop" : "mic"} 
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
              onPress={() => { vibrateIfEnabled(); sendMessage(); }}
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
          </>
        )}
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
            🎤 Procesando...
          </Text>
          <Text style={[
            styles.listeningSubtext,
            userType === 'elderly' && styles.largeListeningText
          ]}>
            Preparando opciones de voz
          </Text>
        </View>
      )}
      {voiceError ? <Text style={{color:'red', marginTop: 4}}>{voiceError}</Text> : null}
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
  },  listeningText: {
    color: 'white',
    fontSize: 16,
  },
  listeningSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 5,
  },
  largeListeningText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  contextIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 5,
    borderLeftColor: '#1976d2',
    padding: 12,
    margin: 16,
    borderRadius: 10,
    marginBottom: 0,
    elevation: 2,
  },
  contextIndicatorText: {
    color: '#1976d2',
    fontSize: 15,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    borderRadius: 25,
    padding: 12,
    minWidth: 50,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatImage: {
    width: 180,
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: '#e3f2fd',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default ChatScreen;