import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';

const ConfigScreen = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [preferences, setPreferences] = useState({
    voiceAlerts: true,
    hapticFeedback: false,
    visualNotifications: true,
    detailLevel: 'medium',
    extraTime: 5
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await AsyncStorage.getItem('userConfig');
      if (config) {
        const parsed = JSON.parse(config);
        setSelectedType(parsed.type);
        setPreferences(parsed.preferences || preferences);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const saveConfig = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Por favor selecciona un tipo de usuario');
      return;
    }

    try {
      const config = {
        type: selectedType,
        preferences: preferences
      };
      
      await AsyncStorage.setItem('userConfig', JSON.stringify(config));
      
      Alert.alert('✅ Éxito', 'Configuración guardada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('❌ Error', `No se pudo guardar: ${error.message}`);
    }
  };

  const userTypes = [
    {
      id: 'visual',
      title: 'Discapacidad Visual',
      description: 'Interfaz optimizada para comandos de voz y retroalimentación auditiva',
      icon: 'eye-off'
    },
    {
      id: 'motor',
      title: 'Movilidad Reducida',
      description: 'Información sobre accesibilidad física y rutas adaptadas',
      icon: 'accessibility'
    },
    {
      id: 'elderly',
      title: 'Adulto Mayor',
      description: 'Interfaz simplificada con botones grandes y tiempos extendidos',
      icon: 'heart'
    },
    {
      id: 'operator',
      title: 'Operador de Transporte',
      description: 'Herramientas de gestión de información de transporte',
      icon: 'business'
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Configuración de Accesibilidad</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Usuario</Text>
          <Text style={styles.sectionDescription}>
            Selecciona tu perfil para personalizar la experiencia
          </Text>

          {userTypes.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.userTypeCard,
                selectedType === type.id && styles.selectedCard
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <View style={styles.cardHeader}>
                <Ionicons 
                  name={type.icon} 
                  size={24} 
                  color={selectedType === type.id ? '#4caf50' : '#666'} 
                />
                <Text style={[
                  styles.cardTitle,
                  selectedType === type.id && styles.selectedText
                ]}>
                  {type.title}
                </Text>
                {selectedType === type.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                )}
              </View>
              <Text style={styles.cardDescription}>{type.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferencias de Alerta</Text>
            
            <TouchableOpacity 
              style={styles.preferenceItem}
              onPress={() => setPreferences({...preferences, voiceAlerts: !preferences.voiceAlerts})}
            >
              <Text style={styles.preferenceText}>Alertas por Voz</Text>
              <Ionicons 
                name={preferences.voiceAlerts ? "toggle" : "toggle-outline"} 
                size={24} 
                color={preferences.voiceAlerts ? "#4caf50" : "#ccc"} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.preferenceItem}
              onPress={() => setPreferences({...preferences, hapticFeedback: !preferences.hapticFeedback})}
            >
              <Text style={styles.preferenceText}>Retroalimentación Háptica</Text>
              <Ionicons 
                name={preferences.hapticFeedback ? "toggle" : "toggle-outline"} 
                size={24} 
                color={preferences.hapticFeedback ? "#4caf50" : "#ccc"} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.preferenceItem}
              onPress={() => setPreferences({...preferences, visualNotifications: !preferences.visualNotifications})}
            >
              <Text style={styles.preferenceText}>Notificaciones Visuales</Text>
              <Ionicons 
                name={preferences.visualNotifications ? "toggle" : "toggle-outline"} 
                size={24} 
                color={preferences.visualNotifications ? "#4caf50" : "#ccc"} 
              />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.saveButton, 
            !selectedType && styles.disabledButton
          ]}
          onPress={saveConfig}
        >
          <Text style={styles.saveButtonText}>Guardar Configuración</Text>
        </TouchableOpacity>

        {/* Espacio adicional al final */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  userTypeCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8e9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
    color: '#333',
  },
  selectedText: {
    color: '#4caf50',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 34,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  preferenceText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4caf50',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ConfigScreen;