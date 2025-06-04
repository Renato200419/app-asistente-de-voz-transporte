import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const HomeScreen = ({ navigation }) => {
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

  const getUserTypeDisplay = () => {
    const types = {
      'visual': 'Discapacidad Visual',
      'motor': 'Movilidad Reducida', 
      'elderly': 'Adulto Mayor',
      'operator': 'Operador de Transporte'
    };
    return types[userType] || 'Sin configurar';
  };

  const getWelcomeMessage = () => {
    const messages = {
      'visual': '¡Hola! Tu interfaz está optimizada para comandos de voz y retroalimentación auditiva.',
      'motor': '¡Hola! Tu interfaz prioriza información sobre accesibilidad física y rutas adaptadas.',
      'elderly': '¡Hola! Tu interfaz está simplificada con botones grandes y tiempos extendidos.',
      'operator': '¡Hola! Tienes acceso a herramientas de gestión de información de transporte.',
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
  return (
    <View style={getContainerStyle()}>
      {/* Header con configuración */}
      <View style={styles.header}>
        <Text style={getTitleStyle()}>Asistente de Transporte</Text>
        <TouchableOpacity 
          style={getConfigButtonStyle()}
          onPress={() => navigation.navigate('Config')}
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

      {/* Indicador de tipo de usuario */}
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

      {/* Mensaje de bienvenida */}
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

      {/* Botones principales */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[getButtonStyle(), styles.primaryButton]}
          onPress={() => navigation.navigate('Chat')}
          accessibilityLabel="Consultar por voz"
          accessibilityHint="Toca para abrir el asistente de voz"
        >
          <Ionicons name="chatbubble" size={getIconSize()} color="white" />
          <Text style={[
            styles.buttonText,
            userType === 'elderly' && styles.largeButtonText
          ]}>
            Consultar por Voz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[getButtonStyle(), styles.secondaryButton]}
          onPress={() => navigation.navigate('Navigation')}
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

        {userType === 'operator' && (
          <TouchableOpacity 
            style={[getButtonStyle(), styles.operatorButton]}
            onPress={() => Alert.alert('Info', 'Panel de operador en desarrollo')}
            accessibilityLabel="Panel de operador"
            accessibilityHint="Toca para acceder al panel de operador"
          >
            <Ionicons name="business" size={getIconSize()} color="white" />
            <Text style={[
              styles.buttonText,
              userType === 'elderly' && styles.largeButtonText
            ]}>
              Panel de Operador
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicadores de accesibilidad */}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  extraLargeText: {
    fontSize: 28,
  },
  whiteText: {
    color: '#fff',
  },
  configButton: {
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  darkConfigButton: {
    backgroundColor: '#333',
  },
  largeConfigButton: {
    padding: 15,
    borderRadius: 25,
  },
  userTypeContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  darkUserTypeContainer: {
    backgroundColor: '#1a237e',
  },
  userTypeText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
  welcomeContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    elevation: 2,
  },
  darkWelcomeContainer: {
    backgroundColor: '#1e1e1e',
  },
  largeWelcomeContainer: {
    padding: 25,
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
  },
  normalButton: {
    backgroundColor: '#2196f3',
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
    elevation: 3,
  },
  largeButton: {
    backgroundColor: '#2196f3',
    padding: 30,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#4caf50',
  },
  secondaryButton: {
    backgroundColor: '#2196f3',  },
  operatorButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },  largeButtonText: {
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