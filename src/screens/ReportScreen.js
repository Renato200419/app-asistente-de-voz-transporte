import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ReportService } from '../services/ReportService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReportScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newReport, setNewReport] = useState({
    location: '',
    description: '',
    type: 'accessibility',
    image: null
  });
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    loadUserConfig();
    loadReports();
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

  const loadReports = async () => {
    const recentReports = await ReportService.getRecentReports();
    setReports(recentReports);
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

  const submitReport = async () => {
    if (!newReport.location || !newReport.description) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      await ReportService.saveReport(newReport);
      Alert.alert('Éxito', 'Reporte enviado correctamente');
      setShowForm(false);
      setNewReport({
        location: '',
        description: '',
        type: 'accessibility',
        image: null
      });
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el reporte');
    }
  };

  const confirmReport = async (reportId) => {
    await ReportService.confirmReport(reportId);
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

  return (
    <View style={getContainerStyle()}>
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
          Reportes de Accesibilidad
        </Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons 
            name="add-circle" 
            size={userType === 'elderly' ? 28 : 24} 
            color="#4caf50" 
          />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={[
          styles.formContainer, 
          userType === 'visual' && styles.darkForm,
          userType === 'elderly' && styles.largeForm
        ]}>
          <TextInput
            style={[
              styles.input, 
              userType === 'visual' && styles.darkInput,
              userType === 'elderly' && styles.largeInput
            ]}
            placeholder="Ubicación (ej: Estación Central)"
            value={newReport.location}
            onChangeText={(text) => setNewReport({ ...newReport, location: text })}
            placeholderTextColor={userType === 'visual' ? '#ccc' : '#999'}
          />
          
          <TextInput
            style={[
              styles.input, 
              styles.textArea, 
              userType === 'visual' && styles.darkInput,
              userType === 'elderly' && styles.largeInput
            ]}
            placeholder="Describe el problema de accesibilidad"
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
            <TouchableOpacity 
              style={[
                styles.imageButton,
                userType === 'elderly' && styles.largeImageButton
              ]} 
              onPress={takePhoto}
            >
              <Ionicons 
                name="camera" 
                size={userType === 'elderly' ? 24 : 20} 
                color="white" 
              />
              <Text style={[
                styles.imageButtonText,
                userType === 'elderly' && styles.largeButtonText
              ]}>
                Tomar Foto
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.imageButton,
                userType === 'elderly' && styles.largeImageButton
              ]} 
              onPress={selectImage}
            >
              <Ionicons 
                name="image" 
                size={userType === 'elderly' ? 24 : 20} 
                color="white" 
              />
              <Text style={[
                styles.imageButtonText,
                userType === 'elderly' && styles.largeButtonText
              ]}>
                Galería
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[
              styles.submitButton,
              userType === 'elderly' && styles.largeSubmitButton
            ]} 
            onPress={submitReport}
          >
            <Text style={[
              styles.submitButtonText,
              userType === 'elderly' && styles.largeSubmitButtonText
            ]}>
              Enviar Reporte
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.reportsList}>
        {reports.map((report) => (
          <View key={report.id} style={[
            styles.reportCard, 
            userType === 'visual' && styles.darkCard,
            userType === 'elderly' && styles.largeCard
          ]}>
            <View style={styles.reportHeader}>
              <Ionicons name="location" size={20} color="#2196f3" />
              <Text style={[
                styles.reportLocation, 
                getTextStyle()
              ]}>
                {report.location}
              </Text>
            </View>
            
            <Text style={[
              styles.reportDescription, 
              getTextStyle()
            ]}>
              {report.description}
            </Text>
            
            {report.image && (
              <Image source={{ uri: report.image }} style={styles.reportImage} />
            )}
            
            <View style={styles.reportFooter}>
              <Text style={[
                styles.reportTime,
                userType === 'visual' && styles.whiteTime
              ]}>
                {new Date(report.timestamp).toLocaleString()}
              </Text>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => confirmReport(report.id)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
                <Text style={styles.confirmText}>
                  {report.confirmations} confirmaciones
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
  formContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
  },
  darkForm: {
    backgroundColor: '#2d2d2d',
  },
  largeForm: {
    padding: 25,
    borderRadius: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  darkInput: {
    backgroundColor: '#333',
    borderColor: '#555',
    color: '#fff',
  },
  largeInput: {
    padding: 16,
    fontSize: 18,
    borderRadius: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 8,
  },
  largeImageButton: {
    padding: 15,
    borderRadius: 12,
  },
  imageButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
    fontSize: 14,
  },
  largeButtonText: {
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  largeSubmitButton: {
    padding: 20,
    borderRadius: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  largeSubmitButtonText: {
    fontSize: 20,
  },
  reportsList: {
    flex: 1,
    padding: 20,
  },
  reportCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#2d2d2d',
  },
  largeCard: {
    padding: 20,
    borderRadius: 15,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportLocation: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
    color: '#333',
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  reportImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportTime: {
    fontSize: 12,
    color: '#999',
  },
  whiteTime: {
    color: '#ccc',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 12,
    color: '#4caf50',
    marginLeft: 5,
  },
});

export default ReportScreen;