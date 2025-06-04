import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const HomeScreen = ({ navigation }) => {
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    loadUserConfig();
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

  const buttonStyle = userType === 'elderly' ? styles.largeButton : styles.normalButton;
  const textStyle = userType === 'visual' ? styles.largeText : styles.normalText;

  return (
    <View style={[styles.container, userType === 'visual' && styles.highContrastBg]}>
      {/* Header con configuración */}
      <View style={styles.header}>
        <Text style={[styles.title, textStyle]}>Asistente de Transporte</Text>
        <TouchableOpacity 
          style={styles.configButton}
          onPress={() => navigation.navigate('Config')}
        >
          <Ionicons name="settings" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Indicador de tipo de usuario */}
      <View style={styles.userTypeContainer}>
        <Text style={[styles.userTypeText, textStyle]}>
          Perfil: {getUserTypeDisplay()}
        </Text>
      </View>

      {/* Mensaje de bienvenida */}
      <View style={styles.welcomeContainer}>
        <Text style={[styles.welcomeText, textStyle]}>
          {getWelcomeMessage()}
        </Text>
      </View>

      {/* Botones principales */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[buttonStyle, styles.primaryButton]}
          onPress={() => navigation.navigate('Chat')}
        >
          <Ionicons name="chatbubble" size={userType === 'elderly' ? 40 : 30} color="white" />
          <Text style={[styles.buttonText, textStyle]}>
            Consultar por Voz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[buttonStyle, styles.secondaryButton]}
          onPress={() => navigation.navigate('Navigation')}
        >
          <Ionicons name="navigate" size={userType === 'elderly' ? 40 : 30} color="white" />
          <Text style={[styles.buttonText, textStyle]}>
            Mi Viaje
          </Text>
        </TouchableOpacity>

        {userType === 'operator' && (
          <TouchableOpacity 
            style={[buttonStyle, styles.operatorButton]}
            onPress={() => Alert.alert('Info', 'Panel de operador en desarrollo')}
          >
            <Ionicons name="business" size={30} color="white" />
            <Text style={[styles.buttonText, textStyle]}>
              Panel de Operador
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicadores de accesibilidad */}
      {userType && (
        <View style={styles.accessibilityIndicators}>
          {userType === 'visual' && (
            <Text style={styles.indicatorText}>🔊 Audio activado</Text>
          )}
          {userType === 'motor' && (
            <Text style={styles.indicatorText}>♿ Rutas accesibles priorizadas</Text>
          )}
          {userType === 'elderly' && (
            <Text style={styles.indicatorText}>⏱️ Tiempos extendidos activados</Text>
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
  configButton: {
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  userTypeContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
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
    backgroundColor: '#2196f3',
  },
  operatorButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  normalText: {
    fontSize: 16,
    color: '#333',
  },
  largeText: {
    fontSize: 20,
    color: '#fff',
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
});

export default HomeScreen;