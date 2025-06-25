import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';

const ConfigScreen = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [currentUserType, setCurrentUserType] = useState(null);
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
        setCurrentUserType(parsed.type);
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
    }
  ];

  const getContainerStyle = () => {
    const baseStyle = styles.container;
    if (currentUserType === 'visual') {
      return [baseStyle, styles.darkTheme];
    }
    return baseStyle;
  };

  const getTextStyle = () => {
    if (currentUserType === 'visual') {
      return [styles.whiteText];
    } else if (currentUserType === 'elderly') {
      return [styles.largeText];
    }
    return {};
  };

  const getIconSize = () => {
    return currentUserType === 'elderly' ? 28 : 24;
  };

  const getCardStyle = (typeId) => {
    const baseStyle = [
      styles.userTypeCard,
      selectedType === typeId && styles.selectedCard
    ];
    
    if (currentUserType === 'visual') {
      baseStyle.push(styles.darkCard);
      if (selectedType === typeId) {
        baseStyle.push(styles.selectedDarkCard);
      }
    } else if (currentUserType === 'elderly') {
      baseStyle.push(styles.largeCard);
    }
    
    return baseStyle;
  };

  return (
    <View style={getContainerStyle()}>
      <View style={[styles.header, currentUserType === 'visual' && styles.darkHeader]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons 
            name="arrow-back" 
            size={getIconSize()} 
            color={currentUserType === 'visual' ? '#fff' : '#333'} 
          />
        </TouchableOpacity>
        <Text style={[
          styles.title, 
          getTextStyle(),
          currentUserType === 'elderly' && styles.largeTitle
        ]}>
          Configuración de Accesibilidad
        </Text>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle,
            getTextStyle(),
            currentUserType === 'elderly' && styles.largeSectionTitle
          ]}>
            Tipo de Usuario
          </Text>
          <Text style={[
            styles.sectionDescription,
            getTextStyle(),
            currentUserType === 'elderly' && styles.largeSectionDescription
          ]}>
            Selecciona tu perfil para personalizar la experiencia
          </Text>

          {userTypes.map(type => (
            <TouchableOpacity
              key={type.id}
              style={getCardStyle(type.id)}
              onPress={() => setSelectedType(type.id)}
              accessibilityLabel={`Seleccionar ${type.title}`}
              accessibilityHint={type.description}
            >
              <View style={styles.cardHeader}>
                <Ionicons 
                  name={type.icon} 
                  size={getIconSize()} 
                  color={selectedType === type.id ? '#4caf50' : (currentUserType === 'visual' ? '#fff' : '#666')} 
                />
                <Text style={[
                  styles.cardTitle,
                  selectedType === type.id && styles.selectedText,
                  getTextStyle(),
                  currentUserType === 'elderly' && styles.largeCardTitle
                ]}>
                  {type.title}
                </Text>
                {selectedType === type.id && (
                  <Ionicons name="checkmark-circle" size={getIconSize()} color="#4caf50" />
                )}
              </View>
              <Text style={[
                styles.cardDescription,
                getTextStyle(),
                currentUserType === 'elderly' && styles.largeCardDescription
              ]}>
                {type.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {selectedType && (
          <View style={styles.section}>
            <Text style={[
              styles.sectionTitle,
              getTextStyle(),
              currentUserType === 'elderly' && styles.largeSectionTitle
            ]}>
              Preferencias de Alerta
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.preferenceItem,
                currentUserType === 'visual' && styles.darkPreferenceItem,
                currentUserType === 'elderly' && styles.largePreferenceItem
              ]}
              onPress={() => setPreferences({...preferences, voiceAlerts: !preferences.voiceAlerts})}
              accessibilityLabel="Alertas por voz"
              accessibilityHint={`${preferences.voiceAlerts ? 'Activado' : 'Desactivado'}. Toca para cambiar`}
            >
              <Text style={[
                styles.preferenceText,
                getTextStyle(),
                currentUserType === 'elderly' && styles.largePreferenceText
              ]}>
                Alertas por Voz
              </Text>
              <Ionicons 
                name={preferences.voiceAlerts ? "toggle" : "toggle-outline"} 
                size={getIconSize()} 
                color={preferences.voiceAlerts ? "#4caf50" : "#ccc"} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.preferenceItem,
                currentUserType === 'visual' && styles.darkPreferenceItem,
                currentUserType === 'elderly' && styles.largePreferenceItem
              ]}
              onPress={() => setPreferences({...preferences, hapticFeedback: !preferences.hapticFeedback})}
              accessibilityLabel="Retroalimentación háptica"
              accessibilityHint={`${preferences.hapticFeedback ? 'Activado' : 'Desactivado'}. Toca para cambiar`}
            >
              <Text style={[
                styles.preferenceText,
                getTextStyle(),
                currentUserType === 'elderly' && styles.largePreferenceText
              ]}>
                Retroalimentación Háptica
              </Text>
              <Ionicons 
                name={preferences.hapticFeedback ? "toggle" : "toggle-outline"} 
                size={getIconSize()} 
                color={preferences.hapticFeedback ? "#4caf50" : "#ccc"} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.preferenceItem,
                currentUserType === 'visual' && styles.darkPreferenceItem,
                currentUserType === 'elderly' && styles.largePreferenceItem
              ]}
              onPress={() => setPreferences({...preferences, visualNotifications: !preferences.visualNotifications})}
              accessibilityLabel="Notificaciones visuales"
              accessibilityHint={`${preferences.visualNotifications ? 'Activado' : 'Desactivado'}. Toca para cambiar`}
            >
              <Text style={[
                styles.preferenceText,
                getTextStyle(),
                currentUserType === 'elderly' && styles.largePreferenceText              ]}>
                Notificaciones Visuales
              </Text>
              <Ionicons
                name={preferences.visualNotifications ? "toggle" : "toggle-outline"} 
                size={getIconSize()} 
                color={preferences.visualNotifications ? "#4caf50" : "#ccc"} 
              />
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity
          style={[
            styles.saveButton, 
            !selectedType && styles.disabledButton,
            currentUserType === 'elderly' && styles.largeSaveButton
          ]}
          onPress={saveConfig}
          accessibilityLabel="Guardar configuración"
          accessibilityHint="Toca para guardar los cambios realizados"
        >
          <Text style={[
            styles.saveButtonText,
            currentUserType === 'elderly' && styles.largeSaveButtonText
          ]}>
            Guardar Configuración
          </Text>
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
  darkTheme: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  darkHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#444',
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
  largeTitle: {
    fontSize: 24,
  },
  whiteText: {
    color: '#fff',
  },
  largeText: {
    fontSize: 18,
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
  largeSectionTitle: {
    fontSize: 22,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  largeSectionDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  userTypeCard: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  darkCard: {
    backgroundColor: '#2d2d2d',
  },
  largeCard: {
    padding: 22,
    borderRadius: 15,
  },
  selectedCard: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8e9',
  },
  selectedDarkCard: {
    backgroundColor: '#1b5e20',
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
  largeCardTitle: {
    fontSize: 20,
  },
  selectedText: {
    color: '#4caf50',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 34,
  },
  largeCardDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginLeft: 40,
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
  darkPreferenceItem: {
    backgroundColor: '#2d2d2d',
  },
  largePreferenceItem: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  preferenceText: {
    fontSize: 16,
    color: '#333',
  },
  largePreferenceText: {
    fontSize: 18,
  },
  saveButton: {
    backgroundColor: '#4caf50',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  largeSaveButton: {
    padding: 25,
    borderRadius: 15,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  largeSaveButtonText: {
    fontSize: 22,
  },
});

export default ConfigScreen;