import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, Vibration, Modal, View as RNView, Text as RNText } from 'react-native';

const HomeScreen = ({ navigation }) => {
  const [userType, setUserType] = useState(null);
  const [preferences, setPreferences] = useState({
    voiceAlerts: true,
    hapticFeedback: false,
    visualNotifications: true,
    detailLevel: 'medium',
    extraTime: 5
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const tutorialPages = [
    {
      title: '¡Bienvenido a tu Asistente de Transporte!',
      text: 'Esta app te ayuda a planificar viajes accesibles, reportar problemas y recibir ayuda en tiempo real.'
    },
    {
      title: 'Planifica tu viaje',
      text: 'Ingresa tu origen y destino, usa autocompletado y obtén rutas en tiempo real con pasos claros.'
    },
    {
      title: 'Reporta y ayuda',
      text: 'Puedes reportar problemas de accesibilidad y ver reportes recientes de otros usuarios.'
    },
    {
      title: 'Personaliza tu experiencia',
      text: 'Configura tu perfil y preferencias de accesibilidad para una experiencia adaptada a ti.'
    }
  ];

  useEffect(() => {
    loadUserConfig();
    checkTutorial();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserConfig();
    });

    return unsubscribe;
  }, [navigation]);

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

  const checkTutorial = async () => {
    try {
      const seen = await AsyncStorage.getItem('tutorialSeen');
      if (!seen) setShowTutorial(true);
    } catch {}
  };

  const closeTutorial = async () => {
    setShowTutorial(false);
    await AsyncStorage.setItem('tutorialSeen', 'true');
  };

  const getUserTypeDisplay = () => {
    const types = {
      'visual': 'Discapacidad Visual',
      'motor': 'Movilidad Reducida', 
      'elderly': 'Adulto Mayor'
    };
    return types[userType] || 'Sin configurar';
  };

  const getWelcomeMessage = () => {
    const messages = {
      'visual': '¡Hola! Tu interfaz está optimizada para comandos de voz y retroalimentación auditiva.',
      'motor': '¡Hola! Tu interfaz prioriza información sobre accesibilidad física y rutas adaptadas.',
      'elderly': '¡Hola! Tu interfaz está simplificada con botones grandes y tiempos extendidos.',
      null: '¡Hola! Configura tu perfil para una experiencia personalizada.'
    };
    return messages[userType];
  };

  const getContainerStyle = () => {
    const baseStyle = styles.container;
    if (userType === 'visual') {
      return [baseStyle, styles.highContrastBg];
    }
    return baseStyle;
  };

  const getTextStyle = () => {
    if (userType === 'visual') {
      return [styles.normalText, styles.whiteText];
    } else if (userType === 'elderly') {
      return [styles.largeText];
    }
    return [styles.normalText];
  };

  const getTitleStyle = () => {
    const baseStyle = styles.title;
    if (userType === 'visual') {
      return [baseStyle, styles.whiteText, styles.extraLargeText];
    } else if (userType === 'elderly') {
      return [baseStyle, styles.extraLargeText];
    }
    return baseStyle;
  };

  const getButtonStyle = () => {
    return userType === 'elderly' ? styles.largeButton : styles.normalButton;
  };

  const getIconSize = () => {
    return userType === 'elderly' ? 40 : 30;
  };

  const getConfigButtonStyle = () => {
    const baseStyle = styles.configButton;
    if (userType === 'visual') {
      return [baseStyle, styles.darkConfigButton];
    } else if (userType === 'elderly') {
      return [baseStyle, styles.largeConfigButton];
    }
    return baseStyle;
  };

  const vibrateIfEnabled = () => {
    if (preferences.hapticFeedback) {
      Vibration.vibrate(50);
    }
  };

  return (
    <View style={getContainerStyle()}>
      <View style={styles.header}>
        <Text style={getTitleStyle()}>Asistente de Transporte</Text>
        <TouchableOpacity 
          style={getConfigButtonStyle()}
          onPress={() => { vibrateIfEnabled(); navigation.navigate('Config'); }}
          accessibilityLabel="Configuración"
          accessibilityHint="Toca para abrir la configuración de accesibilidad"
        >
          <Ionicons 
            name="settings" 
            size={userType === 'elderly' ? 28 : 24} 
            color={userType === 'visual' ? '#fff' : '#333'} 
          />
        </TouchableOpacity>
      </View>

      {userType && (
        <View style={[
          styles.userTypeContainer,
          userType === 'visual' && styles.darkUserTypeContainer
        ]}>
          <Text style={[
            styles.userTypeText, 
            getTextStyle(),
            userType === 'visual' && styles.whiteText
          ]}>
            Perfil: {getUserTypeDisplay()}
          </Text>
        </View>
      )}

      <View style={[
        styles.welcomeContainer,
        userType === 'visual' && styles.darkWelcomeContainer,
        userType === 'elderly' && styles.largeWelcomeContainer
      ]}>
        <Text style={[
          styles.welcomeText, 
          getTextStyle(),
          userType === 'visual' && styles.whiteText
        ]}>
          {getWelcomeMessage()}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[getButtonStyle(), styles.primaryButton]}
          onPress={() => { vibrateIfEnabled(); navigation.navigate('Chat'); }}
          accessibilityLabel="Asistente inteligente"
          accessibilityHint="Toca para abrir el asistente inteligente"
        >
          <Ionicons name="chatbubble" size={getIconSize()} color="white" />
          <Text style={[
            styles.buttonText,
            userType === 'elderly' && styles.largeButtonText
          ]}>
            Asistente Inteligente
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[getButtonStyle(), styles.secondaryButton]}
          onPress={() => { vibrateIfEnabled(); navigation.navigate('Navigation'); }}
          accessibilityLabel="Mi viaje"
          accessibilityHint="Toca para planificar tu viaje"
        >
          <Ionicons name="navigate" size={getIconSize()} color="white" />
          <Text style={[
            styles.buttonText,
            userType === 'elderly' && styles.largeButtonText
          ]}>
            Mi Viaje
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[getButtonStyle(), styles.reportButton]}
          onPress={() => { vibrateIfEnabled(); navigation.navigate('Report'); }}
          accessibilityLabel="Reportar problemas"
          accessibilityHint="Toca para reportar problemas de accesibilidad"
        >
          <Ionicons name="warning" size={getIconSize()} color="white" />
          <Text style={[
            styles.buttonText,
            userType === 'elderly' && styles.largeButtonText
          ]}>
            Reportar Problemas
          </Text>
        </TouchableOpacity>
      </View>

      {userType && (
        <View style={styles.accessibilityIndicators}>
          {userType === 'visual' && preferences.voiceAlerts && (
            <Text style={[
              styles.indicatorText,
              userType === 'visual' && styles.whiteIndicator,
              userType === 'elderly' && styles.largeIndicator
            ]}>
              🔊 Audio activado
            </Text>
          )}
          {userType === 'motor' && (
            <Text style={[
              styles.indicatorText,
              userType === 'visual' && styles.whiteIndicator,
              userType === 'elderly' && styles.largeIndicator
            ]}>
              ♿ Rutas accesibles priorizadas
            </Text>
          )}
          {userType === 'elderly' && (
            <Text style={[
              styles.indicatorText,
              userType === 'visual' && styles.whiteIndicator,
              userType === 'elderly' && styles.largeIndicator
            ]}>
              ⏱️ Tiempos extendidos activados ({preferences.extraTime} min)
            </Text>
          )}
          {preferences.hapticFeedback && (
            <Text style={[
              styles.indicatorText,
              userType === 'visual' && styles.whiteIndicator,
              userType === 'elderly' && styles.largeIndicator
            ]}>
              📳 Vibración activada
            </Text>
          )}
        </View>
      )}

      <Modal visible={showTutorial} transparent animationType="fade">
        <RNView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <RNView style={{ backgroundColor: 'white', borderRadius: 18, padding: 28, width: '85%', alignItems: 'center', elevation: 6 }}>
            <RNText style={{ fontSize: 22, fontWeight: 'bold', color: '#1976d2', marginBottom: 12, textAlign: 'center' }}>{tutorialPages[tutorialStep].title}</RNText>
            <RNText style={{ fontSize: 16, color: '#333', marginBottom: 24, textAlign: 'center' }}>{tutorialPages[tutorialStep].text}</RNText>
            <RNView style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
              {tutorialStep < tutorialPages.length - 1 && (
                <TouchableOpacity onPress={() => setTutorialStep(tutorialStep + 1)} style={{ backgroundColor: '#4caf50', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 8, marginRight: 8 }}>
                  <RNText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Siguiente</RNText>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={closeTutorial} style={{ backgroundColor: '#2196f3', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 8 }}>
                <RNText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{tutorialStep < tutorialPages.length - 1 ? 'Cerrar' : '¡Listo!'}</RNText>
              </TouchableOpacity>
            </RNView>
          </RNView>
        </RNView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 50,
  },
  highContrastBg: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  extraLargeText: {
    fontSize: 30,
  },
  whiteText: {
    color: '#fff',
  },
  yellowText: {
    color: '#ffe082',
  },
  configButton: {
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  darkConfigButton: {
    backgroundColor: '#222',
    borderColor: '#fff',
    borderWidth: 2,
  },
  largeConfigButton: {
    padding: 15,
    borderRadius: 25,
  },
  userTypeContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  darkUserTypeContainer: {
    backgroundColor: '#111',
    borderColor: '#fff',
    borderWidth: 2,
  },
  userTypeText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
  welcomeContainer: {
    backgroundColor: 'white',
    padding: 22,
    borderRadius: 12,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  darkWelcomeContainer: {
    backgroundColor: '#111',
    borderColor: '#fff',
    borderWidth: 2,
  },
  largeWelcomeContainer: {
    padding: 28,
    borderRadius: 15,
  },
  welcomeText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  normalButton: {
    backgroundColor: '#222',
    borderColor: '#fff',
    borderWidth: 2,
    padding: 24,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    width: '100%',
    elevation: 3,
  },
  largeButton: {
    backgroundColor: '#2196f3',
    padding: 30,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: '#1976d2',
    borderColor: '#ffe082',
    borderWidth: 2,
  },
  secondaryButton: {
    backgroundColor: '#333',
    borderColor: '#fff',
    borderWidth: 2,
  },
  reportButton: {
    backgroundColor: '#c62828',
    borderColor: '#ffe082',
    borderWidth: 2,
  },
  buttonText: {
    color: '#ffe082',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    flexShrink: 1,
  },
  largeButtonText: {
    fontSize: 22,
  },
  normalText: {
    fontSize: 16,
    color: '#333',
  },
  largeText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  accessibilityIndicators: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  indicatorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  whiteIndicator: {
    color: '#ccc',
  },
  largeIndicator: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;