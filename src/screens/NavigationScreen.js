import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NavigationScreen = ({ navigation }) => {
  const [userType, setUserType] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

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

  const navigationSteps = [
    {
      instruction: "Dirígete a la estación Línea 1 - Estación Central",
      detail: "Camina 200 metros hacia el norte",
      timeRemaining: "8 minutos",
      accessibility: userType === 'motor' ? "Ruta con rampa de acceso disponible" : null
    },
    {
      instruction: "Aborda el tren Línea 1 dirección Norte",
      detail: "El tren llega en 3 minutos",
      timeRemaining: "25 minutos",
      accessibility: userType === 'visual' ? "Anuncio de voz activado en el tren" : null
    },
    {
      instruction: "Bajada en Estación Universidad",
      detail: "Prepárate para bajar en la próxima parada",
      timeRemaining: "5 minutos",
      accessibility: userType === 'elderly' ? "Tiempo extra de 2 minutos para transbordo" : null
    }
  ];

  const currentStepData = navigationSteps[currentStep - 1];

  const handleNextStep = () => {
    if (currentStep < navigationSteps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      Alert.alert('¡Viaje Completado!', 'Has llegado a tu destino.');
    }
  };

  const getStepStyle = () => {
    return userType === 'elderly' ? styles.largeStep : styles.normalStep;
  };

  const getTextStyle = () => {
    return userType === 'visual' ? styles.largeText : styles.normalText;
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
          Mi Viaje
        </Text>
      </View>

      {/* Información del viaje actual */}
      <View style={styles.routeInfo}>
        <Text style={[styles.routeTitle, getTextStyle()]}>
          Universidad Central → Estación Norte
        </Text>
        <Text style={[styles.routeTime, getTextStyle()]}>
          Tiempo estimado: 35 minutos
        </Text>
      </View>

      {/* Paso actual */}
      <View style={[styles.currentStepContainer, getStepStyle()]}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>Paso {currentStep} de {navigationSteps.length}</Text>
          <Text style={styles.timeRemaining}>{currentStepData.timeRemaining}</Text>
        </View>
        
        <Text style={[styles.stepInstruction, getTextStyle()]}>
          {currentStepData.instruction}
        </Text>
        
        <Text style={[styles.stepDetail, getTextStyle()]}>
          {currentStepData.detail}
        </Text>

        {currentStepData.accessibility && (
          <View style={styles.accessibilityAlert}>
            <Ionicons name="information-circle" size={20} color="#4caf50" />
            <Text style={styles.accessibilityText}>
              {currentStepData.accessibility}
            </Text>
          </View>
        )}
      </View>

      {/* Botones de acción */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.repeatButton]}
          onPress={() => Alert.alert('Repetir', currentStepData.instruction)}
        >
          <Ionicons name="refresh" size={24} color="white" />
          <Text style={styles.buttonText}>Repetir Instrucción</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.nextButton]}
          onPress={handleNextStep}
        >
          <Ionicons name="arrow-forward" size={24} color="white" />
          <Text style={styles.buttonText}>
            {currentStep < navigationSteps.length ? 'Siguiente Paso' : 'Finalizar Viaje'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alertas de servicio */}
      <View style={styles.alertsContainer}>
        <Text style={[styles.alertsTitle, getTextStyle()]}>Reportes Recientes</Text>
        
        <View style={styles.alertItem}>
          <Ionicons name="warning" size={20} color="#ff9800" />
          <View style={styles.alertContent}>
            <Text style={styles.alertText}>Ascensor fuera de servicio</Text>
            <Text style={styles.alertTime}>Estación Central - hace 20 min</Text>
            <Text style={styles.alertConfirmations}>✓ 5 confirmaciones</Text>
          </View>
        </View>

        <View style={styles.alertItem}>
          <Ionicons name="information-circle" size={20} color="#2196f3" />
          <View style={styles.alertContent}>
            <Text style={styles.alertText}>Rampa bloqueada</Text>
            <Text style={styles.alertTime}>Estación Norte - hace 45 min</Text>
            <Text style={styles.alertConfirmations}>✓ 3 confirmaciones</Text>
          </View>
        </View>
      </View>

      {/* Botón de emergencia para usuarios con discapacidades */}
      {(userType === 'visual' || userType === 'motor') && (
        <TouchableOpacity 
          style={styles.emergencyButton}
          onPress={() => Alert.alert('Asistencia', 'Solicitando asistencia personalizada...')}
        >
          <Ionicons name="help-circle" size={24} color="white" />
          <Text style={styles.emergencyText}>Solicitar Asistencia</Text>
        </TouchableOpacity>
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
  routeInfo: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 5,
  },
  routeTime: {
    fontSize: 16,
    color: '#1976d2',
  },
  currentStepContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
    elevation: 3,
  },
  normalStep: {
    padding: 20,
  },
  largeStep: {
    padding: 30,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  timeRemaining: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  stepInstruction: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stepDetail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  normalText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  accessibilityAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    padding: 10,
    borderRadius: 8,
  },
  accessibilityText: {
    fontSize: 14,
    color: '#4caf50',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    margin: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  repeatButton: {
    backgroundColor: '#ff9800',
  },
  nextButton: {
    backgroundColor: '#4caf50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  alertsContainer: {
    margin: 20,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  alertContent: {
    marginLeft: 10,
    flex: 1,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  alertConfirmations: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 2,
  },
  emergencyButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  emergencyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NavigationScreen;