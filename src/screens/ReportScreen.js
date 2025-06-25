import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { saveReport, getRecentReports, confirmReport } from '../services/ReportService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD9rDfG7nsMgkksUyOu57ELS8eqU-8PyJg';

const ReportScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newReport, setNewReport] = useState({
    location: '',
    description: '',
    type: 'accessibility',
    image: null,
    coords: null,
  });
  const [userType, setUserType] = useState(null);
  const [preferences, setPreferences] = useState({
    voiceAlerts: true,
    hapticFeedback: false,
    visualNotifications: true,
    detailLevel: 'medium',
    extraTime: 5
  });
  const [visualBanner, setVisualBanner] = useState(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapCoords, setMapCoords] = useState(null);

  useEffect(() => {
    loadUserConfig();
    loadReports();
  }, []);

  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=es`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    } catch {
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
  };

  const handleShowForm = async () => {
    console.log('[ReportScreen] handleShowForm: Botón presionado.');
    if (!showForm) {
      try {
        console.log('[ReportScreen] handleShowForm: Solicitando permisos de ubicación...');
        let { status } = await Location.requestForegroundPermissionsAsync();
        console.log(`[ReportScreen] handleShowForm: Estado del permiso: ${status}`);

        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'No se puede obtener la ubicación para el reporte.');
          return;
        }

        console.log('[ReportScreen] handleShowForm: Obteniendo ubicación actual (esto puede tardar)...');
        let location = await Location.getCurrentPositionAsync({});
        console.log('[ReportScreen] handleShowForm: Ubicación obtenida:', location.coords);

        const address = await getAddressFromCoords(location.coords.latitude, location.coords.longitude);
        setNewReport(prev => ({
          ...prev,
          coords: { latitude: location.coords.latitude, longitude: location.coords.longitude },
          location: address
        }));
        setMapCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      } catch (e) {
        console.error('[ReportScreen] handleShowForm: Error obteniendo ubicación:', e);
        Alert.alert('Error de ubicación', 'No se pudo obtener la ubicación actual.');
      }
    }
    console.log('[ReportScreen] handleShowForm: Cambiando visibilidad del formulario.');
    setShowForm(!showForm);
  };

  const loadUserConfig = async () => {
    try {
      const config = await AsyncStorage.getItem('userConfig');
      if (config) {
        const parsed = JSON.parse(config);
        setUserType(parsed.type);
        setPreferences(parsed.preferences || preferences);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadReports = async () => {
    try {
      const recentReports = await getRecentReports();
      setReports(recentReports);
    } catch (error) {
      console.error('Error cargando reportes:', error);
    }
  };

  const selectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setNewReport({ ...newReport, image: result.assets[0].uri });
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
    });

    if (!result.canceled) {
      setNewReport({ ...newReport, image: result.assets[0].uri });
    }
  };

  const vibrateIfEnabled = () => {
    if (preferences && preferences.hapticFeedback) {
      Vibration.vibrate(50);
    }
  };

  const speakIfEnabled = (text) => {
    if (preferences && preferences.voiceAlerts) {
      try { Speech.speak(text, { language: 'es' }); } catch {}
    }
  };

  const submitReport = async () => {
    if (!newReport.location || !newReport.description) {
      vibrateIfEnabled();
      if (preferences.visualNotifications) setVisualBanner('Por favor completa todos los campos');
      speakIfEnabled('Por favor completa todos los campos');
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    try {
      await saveReport(newReport);
      vibrateIfEnabled();
      if (preferences.visualNotifications) setVisualBanner('Reporte enviado correctamente');
      speakIfEnabled('Reporte enviado correctamente');
      Alert.alert('Éxito', 'Reporte enviado correctamente');
      setShowForm(false);
      setNewReport({
        location: '',
        description: '',
        type: 'accessibility',
        image: null,
        coords: null,
      });
      loadReports();
    } catch (error) {
      vibrateIfEnabled();
      if (preferences.visualNotifications) setVisualBanner('No se pudo enviar el reporte');
      speakIfEnabled('No se pudo enviar el reporte');
      Alert.alert('Error', 'No se pudo enviar el reporte');
    }
  };

  const handleConfirmReport = async (reportId) => {
    vibrateIfEnabled();
    if (preferences.visualNotifications) setVisualBanner('¡Reporte confirmado!');
    speakIfEnabled('¡Reporte confirmado!');
    await confirmReport(reportId);
    loadReports();
  };

  const getContainerStyle = () => {
    const baseStyle = styles.container;
    if (userType === 'visual') {
      return [baseStyle, styles.darkTheme];
    }
    return baseStyle;
  };

  const getTextStyle = () => {
    if (userType === 'visual') {
      return styles.whiteText;
    } else if (userType === 'elderly') {
      return styles.largeText;
    }
    return {};
  };

  const renderVisualBanner = () => visualBanner ? (
    <View style={{ backgroundColor: '#fff3cd', borderLeftWidth: 6, borderLeftColor: '#ff9800', padding: 12, margin: 16, borderRadius: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 }}>
      <Ionicons name="alert-circle" size={22} color="#ff9800" style={{ marginRight: 8 }} />
      <Text style={{ color: '#8a6d3b', fontWeight: 'bold', flex: 1 }}>{visualBanner}</Text>
      <TouchableOpacity onPress={() => setVisualBanner(null)} accessibilityLabel="Cerrar alerta visual">
        <Ionicons name="close" size={22} color="#ff9800" />
      </TouchableOpacity>
    </View>
  ) : null;

  const openMapModal = async () => {
    if (newReport.coords) {
      setMapCoords(newReport.coords);
    } else {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let location = await Location.getCurrentPositionAsync({});
        setMapCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      } catch {}
    }
    setMapModalVisible(true);
  };

  const confirmMapLocation = async () => {
    if (mapCoords) {
      const address = await getAddressFromCoords(mapCoords.latitude, mapCoords.longitude);
      setNewReport(prev => ({ ...prev, coords: mapCoords, location: address }));
    }
    setMapModalVisible(false);
  };

  return (
    <View style={getContainerStyle()}>
      {renderVisualBanner()}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons 
            name="arrow-back" 
            size={userType === 'elderly' ? 28 : 24} 
            color={userType === 'visual' ? '#fff' : '#333'} 
          />
        </TouchableOpacity>
        <Text style={[
          styles.title, 
          getTextStyle(),
          userType === 'elderly' && styles.largeTitle
        ]}>
          Reportes
        </Text>
        <TouchableOpacity onPress={handleShowForm}>
          <Ionicons 
            name="add-circle" 
            size={userType === 'elderly' ? 28 : 24} 
            color="#4caf50" 
          />
        </TouchableOpacity>
      </View>

      {mapModalVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', height: 400, backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', elevation: 5 }}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: mapCoords?.latitude || -12.0464,
                longitude: mapCoords?.longitude || -77.0428,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              region={mapCoords ? {
                latitude: mapCoords.latitude,
                longitude: mapCoords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              } : undefined}
              onPress={e => setMapCoords(e.nativeEvent.coordinate)}
            >
              {mapCoords && (
                <Marker
                  coordinate={mapCoords}
                  draggable
                  onDragEnd={e => setMapCoords(e.nativeEvent.coordinate)}
                />
              )}
            </MapView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fafafa' }}>
              <TouchableOpacity onPress={() => setMapModalVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: '#f44336', fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmMapLocation} style={{ padding: 10 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Confirmar ubicación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showForm && (
        <View style={[
          styles.formContainer, 
          userType === 'visual' && styles.darkForm,
          userType === 'elderly' && styles.largeForm
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[
                styles.input, 
                userType === 'visual' && styles.darkInput,
                userType === 'elderly' && styles.largeInput,
                { flex: 1 }
              ]}
              placeholder="Ubicación (ej: Estación Central)"
              value={newReport.location}
              onChangeText={(text) => setNewReport({ ...newReport, location: text })}
              placeholderTextColor={userType === 'visual' ? '#ccc' : '#999'}
            />
            <TouchableOpacity onPress={openMapModal} style={{ marginLeft: 8 }}>
              <Ionicons name="map" size={24} color="#1976d2" />
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 10 }}>
            <Text style={{ marginRight: 10, fontWeight: 'bold', color: userType === 'visual' ? '#fff' : '#333', marginBottom: 6 }}>Tipo:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row' }}>
              {[
                { key: 'accesibilidad', label: 'Accesibilidad' },
                { key: 'trafico', label: 'Tráfico/Vías' },
                { key: 'infraestructura', label: 'Infraestructura' },
                { key: 'seguridad', label: 'Seguridad' },
                { key: 'limpieza', label: 'Limpieza' },
                { key: 'otros', label: 'Otros' }
              ].map((tipo) => (
                <TouchableOpacity
                  key={tipo.key}
                  style={{
                    backgroundColor: newReport.type === tipo.key ? '#1976d2' : '#eee',
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    marginRight: 8,
                    borderWidth: newReport.type === tipo.key ? 2 : 1,
                    borderColor: newReport.type === tipo.key ? '#1976d2' : '#ccc',
                  }}
                  onPress={() => setNewReport({ ...newReport, type: tipo.key })}
                  accessibilityLabel={`Seleccionar tipo ${tipo.label}`}
                >
                  <Text style={{ color: newReport.type === tipo.key ? '#fff' : '#333', fontWeight: 'bold' }}>
                    {tipo.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TextInput
            style={[
              styles.input, 
              styles.textArea, 
              userType === 'visual' && styles.darkInput,
              userType === 'elderly' && styles.largeInput
            ]}
            placeholder="Describe el problema"
            value={newReport.description}
            onChangeText={(text) => setNewReport({ ...newReport, description: text })}
            multiline
            numberOfLines={4}
            placeholderTextColor={userType === 'visual' ? '#ccc' : '#999'}
          />

          {newReport.image && (
            <Image source={{ uri: newReport.image }} style={styles.previewImage} />
          )}

          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={selectImage}>
              <Ionicons name="image" size={20} color="white" />
              <Text style={styles.imageButtonText}>Galería</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.imageButtonText}>Cámara</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.submitButton} onPress={submitReport}>
            <Text style={styles.submitButtonText}>Enviar Reporte</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {reports.length === 0 ? (
          <Text style={[styles.emptyText, getTextStyle()]}>No hay reportes recientes.</Text>
        ) : (
          reports.map((report, idx) => (
            <View key={idx} style={[styles.reportCard, userType === 'visual' && styles.darkCard, userType === 'elderly' && styles.largeCard]}>
              <Text style={[styles.reportType, getTextStyle()]}>Tipo: {report.type === 'accessibility' ? 'Accesibilidad' : report.type}</Text>
              <Text style={[styles.reportLocation, getTextStyle()]}>Ubicación: {report.location}</Text>
              <Text style={[styles.reportDescription, getTextStyle()]}>Descripción: {report.description}</Text>
              {preferences.detailLevel === 'high' && report.coords && (
                <Text style={[styles.reportDescription, getTextStyle()]}>Coords: {report.coords.latitude.toFixed(5)}, {report.coords.longitude.toFixed(5)}</Text>
              )}
              {report.imageUrl && (
                <Image source={{ uri: report.imageUrl }} style={styles.reportImage} />
              )}
              <View style={styles.confirmContainer}>
                <TouchableOpacity style={styles.confirmButton} onPress={() => handleConfirmReport(report.id)}>
                  <Ionicons name="checkmark-circle" size={22} color="#4caf50" />
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
                <Text style={styles.confirmationsText}>{report.confirmations || 0} confirmaciones</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50
  },
  darkTheme: {
    backgroundColor: '#121212'
  },
  whiteText: {
    color: '#fff'
  },
  largeText: {
    fontSize: 18
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333',
    flex: 1
  },
  largeTitle: {
    fontSize: 24
  },
  formContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  darkForm: {
    borderBottomColor: '#444'
  },
  largeForm: {
    padding: 25
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  darkInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderColor: '#555'
  },
  largeInput: {
    fontSize: 18,
    padding: 20
  },
  textArea: {
    height: 100
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10
  },
  imageButton: {
    backgroundColor: '#2196f3',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  imageButtonText: {
    color: 'white',
    marginLeft: 10
  },
  submitButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  scrollView: {
    flex: 1,
    padding: 20
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
    fontSize: 16
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  darkCard: {
    backgroundColor: '#1e1e1e',
    borderColor: '#444',
    borderWidth: 1
  },
  largeCard: {
    padding: 25
  },
  reportType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  reportLocation: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  reportImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15
  },
  confirmContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 8
  },
  confirmButtonText: {
    color: '#4caf50',
    marginLeft: 8,
    fontWeight: 'bold'
  },
  confirmationsText: {
    color: '#4caf50',
    fontWeight: 'bold'
  }
});

export default ReportScreen;