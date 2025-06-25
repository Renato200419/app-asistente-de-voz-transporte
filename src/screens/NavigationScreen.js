import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, Vibration, Image, ScrollView, Modal } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Keyboard } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { getRecentReports } from '../services/ReportService';

const GOOGLE_MAPS_API_KEY = 'SECRET';
const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const LOCATION_PLACEHOLDER = 'Mi ubicación actual';

// Función para calcular distancia (Haversine)
const haversineDistance = (coords1, coords2) => {
  if (!coords1 || !coords2) return Infinity;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Radio de la Tierra en km

  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en km
};

const NavigationScreen = ({ navigation }) => {
  const [userType, setUserType] = useState(null);
  const [preferences, setPreferences] = useState({
    voiceAlerts: true,
    hapticFeedback: false,
    visualNotifications: true,
    detailLevel: 'medium',
    extraTime: 5
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [routeSteps, setRouteSteps] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeHeader, setRouteHeader] = useState({ start: '', end: '' });
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [visualBanner, setVisualBanner] = useState(null);
  const [relevantReports, setRelevantReports] = useState([]);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapCoords, setMapCoords] = useState(null);
  const [mapTarget, setMapTarget] = useState(null); // 'origin' o 'destination'
  const [routeOptions, setRouteOptions] = useState([]);
  const [showRoutesModal, setShowRoutesModal] = useState(false);

  useEffect(() => {
    loadUserConfig();
    loadHistory();
    loadFavorites();

    // Limpiar el watcher al desmontar el componente
    return () => {
      locationWatcher?.remove();
    };
  }, []);

  // Efecto para vigilar la proximidad a los reportes cuando la ubicación cambia
  useEffect(() => {
    if (!currentUserLocation || relevantReports.length === 0) {
      return;
    }

    relevantReports.forEach(report => {
      if (report.coords && !triggeredAlerts.includes(report.id)) {
        const distance = haversineDistance(currentUserLocation, report.coords);

        // Si está a menos de 100 metros, lanzar alerta
        if (distance < 0.1) {
          const alertMessage = `Atención: reporte cercano de ${report.type}: ${report.description}`;
          
          if (preferences.voiceAlerts) {
            Speech.speak(alertMessage, { language: 'es' });
          }
          if (preferences.hapticFeedback) {
            Vibration.vibrate([100, 50, 200]);
          }
          if (preferences.visualNotifications) {
            setVisualBanner(alertMessage);
          }

          // Marcar alerta como disparada para no repetirla
          setTriggeredAlerts(prev => [...prev, report.id]);
        }
      }
    });

  }, [currentUserLocation, relevantReports]);

  // Actualizar reportes cercanos a la ruta completa (1km de cualquier punto de la polilínea)
  useEffect(() => {
    const updateNearbyReports = async () => {
      if (routeSteps.length === 0 || !routeInfo || !routeInfo.polyline) {
        setRelevantReports([]);
        return;
      }
      try {
        const allReports = await getRecentReports();
        const polylinePoints = routeInfo.polyline || [];
        // Filtrar reportes cercanos a cualquier punto de la polilínea (1km)
        const nearbyReports = allReports.filter(report => {
          if (!report.coords) return false;
          return polylinePoints.some(point => haversineDistance(report.coords, point) < 1);
        });
        setRelevantReports(nearbyReports);
      } catch (error) {
        setRelevantReports([]);
      }
    };
    updateNearbyReports();
  }, [routeSteps, routeInfo]);

  const loadUserConfig = async () => {
    try {
      const config = await AsyncStorage.getItem('userConfig');
      if (config) {
        const parsed = JSON.parse(config);
        setUserType(parsed.type);
        if (parsed.preferences) {
          setPreferences(parsed.preferences);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const h = await AsyncStorage.getItem('travelHistory');
      if (h) setHistory(JSON.parse(h));
    } catch {}
  };

  const loadFavorites = async () => {
    try {
      const f = await AsyncStorage.getItem('favoriteDestinations');
      if (f) setFavorites(JSON.parse(f));
    } catch {}
  };

  const saveHistory = async (origin, destination) => {
    try {
      let h = await AsyncStorage.getItem('travelHistory');
      let arr = h ? JSON.parse(h) : [];
      // Evitar duplicados consecutivos
      if (arr.length === 0 || arr[0].origin !== origin || arr[0].destination !== destination) {
        arr.unshift({ origin, destination });
      }
      arr = arr.slice(0, 5); // Solo los 5 más recientes
      setHistory(arr);
      await AsyncStorage.setItem('travelHistory', JSON.stringify(arr));
    } catch {}
  };

  const saveFavorite = async (destination) => {
    try {
      let f = await AsyncStorage.getItem('favoriteDestinations');
      let arr = f ? JSON.parse(f) : [];
      if (!arr.includes(destination)) {
        arr.unshift(destination);
        arr = arr.slice(0, 5);
        setFavorites(arr);
        await AsyncStorage.setItem('favoriteDestinations', JSON.stringify(arr));
      }
    } catch {}
  };

  const getCurrentLocationString = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        return null;
      }
      let location = await Location.getCurrentPositionAsync({});
      return `${location.coords.latitude},${location.coords.longitude}`;
    } catch (e) {
      setError('No se pudo obtener la ubicación actual');
      return null;
    }
  };

  const fetchPlaceSuggestions = async (input, setSuggestions) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=es&components=country:pe&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK') {
        setSuggestions(data.predictions.map(p => p.description));
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    }
  };

  const handleUseCurrentLocation = () => {
    setUseCurrentLocation(true);
    setOrigin(LOCATION_PLACEHOLDER);
    setShowOriginSuggestions(false);
  };

  const handleOriginChange = (text) => {
    setOrigin(text);
    if (text !== LOCATION_PLACEHOLDER) {
      setUseCurrentLocation(false);
    }
    setShowOriginSuggestions(true);
    fetchPlaceSuggestions(text, setOriginSuggestions);
  };

  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=es`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return `(${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
    } catch {
      return `(${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
    }
  };

  const fetchRoute = async () => {
    setLoadingRoute(true);
    setError(null);
    setRouteSteps([]);
    setRouteInfo(null);
    setRouteHeader({ start: '', end: '' });
    setCurrentStep(1);
    setVisualBanner(null);
    setRelevantReports([]);
    setTriggeredAlerts([]);
    locationWatcher?.remove();
    try {
      let originParam = origin;
      if (useCurrentLocation || origin === LOCATION_PLACEHOLDER) {
        const loc = await getCurrentLocationString();
        if (!loc) {
          setError('No se pudo obtener la ubicación actual. Activa el GPS e inténtalo de nuevo.');
          if (preferences.visualNotifications) setVisualBanner('No se pudo obtener la ubicación actual. Activa el GPS e inténtalo de nuevo.');
          setLoadingRoute(false);
          return;
        }
        originParam = loc;
      }
      if (!originParam || !destination) {
        setError('Por favor ingresa origen y destino');
        if (preferences.visualNotifications) setVisualBanner('Por favor ingresa origen y destino');
        setLoadingRoute(false);
        return;
      }
      await saveHistory(originParam, destination);
      const parseLocation = (param) => {
        if (typeof param === 'string') {
          const parts = param.split(',').map(p => p.trim());
          if (
            parts.length === 2 &&
            !isNaN(Number(parts[0])) &&
            !isNaN(Number(parts[1])) &&
            parts[0] !== '' && parts[1] !== ''
          ) {
            const latitude = Number(parts[0]);
            const longitude = Number(parts[1]);
            if (
              latitude < -90 || latitude > 90 ||
              longitude < -180 || longitude > 180
            ) {
              if (preferences.visualNotifications) setVisualBanner('Coordenadas inválidas');
              throw new Error('Coordenadas inválidas');
            }
            return { location: { latLng: { latitude, longitude } } };
          }
        }
        if (!param || param.trim() === '') {
          if (preferences.visualNotifications) setVisualBanner('Dirección vacía');
          throw new Error('Dirección vacía');
        }
        return { address: param };
      };
      let body;
      try {
        body = {
          origin: parseLocation(originParam),
          destination: parseLocation(destination),
          travelMode: 'TRANSIT',
          computeAlternativeRoutes: true,
          transitPreferences: {
            routingPreference: 'LESS_WALKING',
            allowedTravelModes: ['BUS', 'SUBWAY', 'TRAIN', 'LIGHT_RAIL', 'RAIL']
          }
        };
      } catch (err) {
        setError('Error en los datos de origen o destino: ' + err.message);
        if (preferences.visualNotifications) setVisualBanner('Error en los datos de origen o destino: ' + err.message);
        setLoadingRoute(false);
        return;
      }
      const response = await fetch(GOOGLE_ROUTES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.legs.steps,routes.legs.startLocation,routes.legs.endLocation,routes.legs.polyline,routes.localizedValues'
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        setRouteOptions(data.routes);
        setShowRoutesModal(true);
        setLoadingRoute(false);
        return;
      } else {
        let apiError = data.error?.message || data.error?.status || data.status || data.message;
        setError(apiError ? `Error de la API: ${apiError}` : 'No se encontró una ruta. Intenta con direcciones más específicas.');
        if (preferences.visualNotifications) setVisualBanner(apiError ? `Error de la API: ${apiError}` : 'No se encontró una ruta. Intenta con direcciones más específicas.');
        setLoadingRoute(false);
        return;
      }
    } catch (e) {
      setError('Error al buscar la ruta. Intenta de nuevo.');
      if (preferences.visualNotifications) setVisualBanner('Error al buscar la ruta. Intenta de nuevo.');
    }
    setLoadingRoute(false);
  };

  const handleSelectRoute = async (route) => {
    setShowRoutesModal(false);
    setLoadingRoute(true);
    setRouteSteps([]);
    setRouteInfo(null);
    setRouteHeader({ start: '', end: '' });
    setCurrentStep(1);
    setVisualBanner(null);
    setRelevantReports([]);
    setTriggeredAlerts([]);
    locationWatcher?.remove();
    try {
      const startCoords = route.legs[0].startLocation.latLng;
      const endCoords = route.legs[0].endLocation.latLng;
      const startAddress = await getAddressFromCoords(startCoords.latitude, startCoords.longitude);
      const endAddress = await getAddressFromCoords(endCoords.latitude, endCoords.longitude);
      setRouteHeader({ start: startAddress, end: endAddress });
      const decodedPolyline = decodePolyline(route.legs[0].polyline.encodedPolyline);
      setRouteInfo({
        duration: route.localizedValues?.duration?.text || '',
        polyline: decodedPolyline,
        origin: startCoords,
        destination: endCoords
      });
      try {
        const allReports = await getRecentReports();
        const routeOriginCoords = route.legs[0].startLocation.latLng;
        const routeDestinationCoords = route.legs[0].endLocation.latLng;
        const nearbyReports = allReports.filter(report => {
          if (!report.coords) return false;
          const distToOrigin = haversineDistance(report.coords, routeOriginCoords);
          const distToDestination = haversineDistance(report.coords, routeDestinationCoords);
          return distToOrigin < 0.5 || distToDestination < 0.5;
        });
        setRelevantReports(nearbyReports);
      } catch (reportError) {
        // No detener la navegación si fallan los reportes
      }
      startLocationWatcher();
      const steps = await Promise.all(route.legs[0].steps.map(async (step, index) => {
        const instruction = step.navigationInstruction?.instructions || 'Continúa';
        if (step.travelMode === 'TRANSIT' && step.transitDetails) {
          return {
            tipo: 'transporte',
            instruccion: `Toma ${step.transitDetails.transitLine?.vehicle?.name?.text || 'transporte'} ${step.transitDetails.transitLine?.nameShort || ''} (${step.transitDetails.transitLine?.name || ''}) hacia ${step.transitDetails.headsign || ''}`,
            detalle: preferences.detailLevel === 'high'
              ? `Desde ${step.transitDetails.stopDetails?.departureStop?.name || ''} hasta ${step.transitDetails.stopDetails?.arrivalStop?.name || ''} (${step.transitDetails.stopCount || 0} paradas)\nAgencia: ${step.transitDetails.transitLine?.agencies?.[0]?.name || ''}\nTel: ${step.transitDetails.transitLine?.agencies?.[0]?.phoneNumber || ''}`
              : `Desde ${step.transitDetails.stopDetails?.departureStop?.name || ''} hasta ${step.transitDetails.stopDetails?.arrivalStop?.name || ''} (${step.transitDetails.stopCount || 0} paradas)`,
            colorLinea: step.transitDetails.transitLine?.color,
            icono: step.transitDetails.transitLine?.vehicle?.iconUri,
            horaSalida: step.transitDetails.localizedValues?.departureTime?.time?.text,
            horaLlegada: step.transitDetails.localizedValues?.arrivalTime?.time?.text,
            stopCount: step.transitDetails.stopCount,
            polilinea: step.polyline?.encodedPolyline,
            accessibility: userType === 'motor' ? 'Verifica accesibilidad en la ruta peatonal' : null
          };
        } else if (step.travelMode === 'WALK') {
          const start = await getAddressFromCoords(step.startLocation.latLng.latitude, step.startLocation.latLng.longitude);
          const end = await getAddressFromCoords(step.endLocation.latLng.latitude, step.endLocation.latLng.longitude);
          return {
            id: index,
            text: `🚶 Camina ${step.distanceMeters}m (${step.staticDuration}): ${instruction} desde ${start.split(',')[0]} hasta ${end.split(',')[0]}`,
            tipo: 'caminar',
            distancia: step.distanceMeters,
            duracion: step.staticDuration,
            polilinea: step.polyline?.encodedPolyline,
          };
        } else {
          return null;
        }
      }));
      const validSteps = steps.filter(s => s);
      setRouteSteps(validSteps);
      if (validSteps.length > 0) {
        speakStep(validSteps[0]?.text);
        setRouteInfo({
          duration: route.localizedValues?.duration?.text || '',
          polyline: decodedPolyline,
          origin: startCoords,
          destination: endCoords
        });
      }
    } catch (e) {
      setError('Error al procesar la ruta seleccionada.');
      if (preferences.visualNotifications) setVisualBanner('Error al procesar la ruta seleccionada.');
    }
    setLoadingRoute(false);
  };

  const currentStepData = routeSteps.length > 0 ? routeSteps[currentStep - 1] : null;
  const totalSteps = routeSteps.length;

  const handleNextStep = () => {
    if (currentStep < routeSteps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      speakStep(routeSteps[nextStep - 1]?.text);
      vibrateIfEnabled();
    }
  };

  const getStepStyle = () => {
    return userType === 'elderly' ? styles.largeStep : styles.normalStep;
  };

  const getTextStyle = () => {
    return userType === 'visual' ? styles.largeText : styles.normalText;
  };

  // Leer instrucción por voz
  const speakStep = (text) => {
    if (preferences.voiceAlerts && text) {
      setIsSpeaking(true);
      Speech.speak(text, {
        language: 'es',
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    }
  };

  // Leer automáticamente cada paso nuevo
  useEffect(() => {
    if (routeSteps.length > 0 && currentStep > 0 && currentStep <= routeSteps.length) {
      const step = routeSteps[currentStep - 1];
      speakStep(step.instruccion);
    }
    // eslint-disable-next-line
  }, [currentStep, routeSteps]);

  const handleCancelRoute = () => {
    setRouteSteps([]);
    setRouteInfo(null);
    setOrigin('');
    setDestination('');
    setRouteHeader({ start: '', end: '' });
    setError(null);
    setCurrentStep(1);
    setVisualBanner(null);
    setRelevantReports([]);
    setTriggeredAlerts([]);

    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }

    if (preferences.voiceAlerts) {
      Speech.speak('Ruta cancelada.', { language: 'es' });
    }
    vibrateIfEnabled();
    Keyboard.dismiss();
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      speakStep(routeSteps[prevStep - 1]?.text);
      vibrateIfEnabled();
    }
  };

  const vibrateIfEnabled = () => {
    if (userType && preferences && preferences.hapticFeedback) {
      Vibration.vibrate(50);
    }
  };

  const getVisualButton = () => ({
    backgroundColor: '#222',
    borderColor: '#ffe082',
    borderWidth: 2,
  });
  const getVisualRepeatButton = () => ({
    backgroundColor: '#333',
    borderColor: '#ffe082',
    borderWidth: 2,
  });
  const getVisualNextButton = () => ({
    backgroundColor: '#1976d2',
    borderColor: '#ffe082',
    borderWidth: 2,
  });
  const getVisualCancelButton = () => ({
    backgroundColor: '#c62828',
    borderColor: '#ffe082',
    borderWidth: 2,
  });
  const getVisualText = () => ({ color: '#ffe082' });
  const getVisualInput = () => ({ backgroundColor: '#111', borderColor: '#ffe082', color: '#ffe082' });
  const getVisualAlert = () => ({ backgroundColor: '#222', borderColor: '#ffe082', borderWidth: 2 });

  // Decodificador de polilínea (Google encoded polyline)
  function decodePolyline(encoded) {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  }

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

  const startLocationWatcher = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permiso de ubicación en primer plano denegado');
      return;
    }
    
    const watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000, // Cada 5 segundos
        distanceInterval: 10, // Cada 10 metros
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        setCurrentUserLocation({ latitude, longitude });
        console.log("Ubicación actualizada:", { latitude, longitude });
      }
    );
    setLocationWatcher(watcher);
  };

  // Abrir modal de mapa para seleccionar origen/destino
  const openMapModal = async (target) => {
    setMapTarget(target);
    let coords = null;
    if (target === 'origin' && origin && typeof origin === 'string' && origin.includes(',')) {
      const parts = origin.split(',').map(p => p.trim());
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        coords = { latitude: Number(parts[0]), longitude: Number(parts[1]) };
      }
    } else if (target === 'destination' && destination && typeof destination === 'string' && destination.includes(',')) {
      const parts = destination.split(',').map(p => p.trim());
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        coords = { latitude: Number(parts[0]), longitude: Number(parts[1]) };
      }
    }
    if (!coords) {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let location = await Location.getCurrentPositionAsync({});
        coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      } catch {}
    }
    setMapCoords(coords);
    setMapModalVisible(true);
  };

  // Confirmar selección en el mapa
  const confirmMapLocation = async () => {
    if (mapCoords && mapTarget) {
      const address = await getAddressFromCoords(mapCoords.latitude, mapCoords.longitude);
      if (mapTarget === 'origin') {
        setOrigin(address);
      } else if (mapTarget === 'destination') {
        setDestination(address);
      }
    }
    setMapModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, styles.container, userType === 'visual' && styles.darkTheme, { paddingBottom: insets.bottom || 16 }]} edges={['bottom', 'left', 'right', 'top']}>
      {renderVisualBanner()}
      {/* Modal de mapa para seleccionar origen/destino */}
      {mapModalVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 20, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '92%', height: 420, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }}>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 18, backgroundColor: '#fafafa' }}>
              <TouchableOpacity onPress={() => setMapModalVisible(false)} style={{ padding: 12, borderRadius: 8, backgroundColor: '#f44336' }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmMapLocation} style={{ padding: 12, borderRadius: 8, backgroundColor: '#1976d2' }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Confirmar ubicación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { vibrateIfEnabled(); navigation.goBack(); }} accessibilityLabel="Volver" accessibilityHint="Toca para regresar a la pantalla anterior">
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

        {/* Favoritos */}
        {favorites.length > 0 && !routeSteps.length && (
          <View style={{ marginHorizontal: 20, marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: 4 }}>Destinos favoritos</Text>
            {favorites.map((fav, idx) => (
              <TouchableOpacity key={idx} style={{ padding: 8, borderRadius: 8, backgroundColor: '#e3f2fd', marginBottom: 6 }} onPress={() => setDestination(fav)}>
                <Text style={{ color: '#1976d2' }}>{fav}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Formulario de búsqueda de ruta */}
        {!routeSteps.length && (
          <View style={styles.routeInfo}>
            <Text style={[styles.routeTitle, userType === 'visual' && getVisualText()]}>Planifica tu viaje</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput
                style={[styles.textInput, userType === 'elderly' && styles.largeInput, userType === 'visual' && getVisualInput(), { flex: 1 }]}
                placeholder="Origen (ej: Estación Central o dirección)"
                placeholderTextColor={userType === 'visual' ? '#ccc' : '#999'}
                value={origin}
                onChangeText={handleOriginChange}
                editable={!loadingRoute}
                accessibilityLabel="Campo de origen"
                accessibilityHint="Escribe el punto de partida o dirección"
                onFocus={() => setShowOriginSuggestions(true)}
                onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
              />
              <TouchableOpacity onPress={() => openMapModal('origin')} style={{ marginLeft: 8 }}>
                <Ionicons name="map" size={24} color="#1976d2" />
              </TouchableOpacity>
            </View>
            {showOriginSuggestions && originSuggestions.length > 0 && (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ backgroundColor: '#fff', borderRadius: 8, elevation: 2, marginTop: 2, marginBottom: 6 }}
              >
                {originSuggestions.map((s, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { setOrigin(s); setShowOriginSuggestions(false); }} style={{ padding: 10, borderBottomWidth: idx < originSuggestions.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                    <Text style={{ color: '#333' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={{ marginVertical: 5 }}
              onPress={handleUseCurrentLocation}
              disabled={loadingRoute}
              accessibilityLabel="Usar mi ubicación actual"
              accessibilityHint="Toca para usar tu ubicación actual como origen"
            >
              <Text style={{ color: '#2196f3', fontWeight: 'bold' }}>Usar mi ubicación actual</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput
                style={[styles.textInput, userType === 'elderly' && styles.largeInput, userType === 'visual' && getVisualInput(), { flex: 1 }]}
                placeholder="Destino (ej: Estación Norte o dirección)"
                placeholderTextColor={userType === 'visual' ? '#ccc' : '#999'}
                value={destination}
                onChangeText={text => {
                  setDestination(text);
                  setShowDestinationSuggestions(true);
                  fetchPlaceSuggestions(text, setDestinationSuggestions);
                }}
                editable={!loadingRoute}
                accessibilityLabel="Campo de destino"
                accessibilityHint="Escribe el destino o dirección a la que quieres ir"
                onFocus={() => setShowDestinationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
              />
              <TouchableOpacity onPress={() => openMapModal('destination')} style={{ marginLeft: 8 }}>
                <Ionicons name="map" size={24} color="#1976d2" />
              </TouchableOpacity>
            </View>
            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ backgroundColor: '#fff', borderRadius: 8, elevation: 2, marginTop: 2, marginBottom: 6 }}
              >
                {destinationSuggestions.map((s, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { setDestination(s); setShowDestinationSuggestions(false); }} style={{ padding: 10, borderBottomWidth: idx < destinationSuggestions.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                    <Text style={{ color: '#333' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.nextButton, { marginTop: 10 }]}
              onPress={() => { vibrateIfEnabled(); fetchRoute(); }}
              disabled={loadingRoute}
              accessibilityLabel="Buscar ruta"
              accessibilityHint="Toca para buscar la mejor ruta en transporte público"
            >
              <Ionicons name="search" size={20} color="white" />
              <Text style={styles.buttonText}>Buscar Ruta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 6, alignSelf: 'flex-end' }}
              onPress={() => saveFavorite(destination)}
              disabled={!destination}
            >
              <Text style={{ color: '#ff9800', fontWeight: 'bold', fontSize: 13 }}>★ Guardar destino como favorito</Text>
            </TouchableOpacity>
            {/* Historial de viajes */}
            {history.length > 0 && (
              <View style={{ marginTop: 18, maxHeight: 160, backgroundColor: '#f9fbe7', borderRadius: 10, padding: 8, elevation: 1 }}>
                <Text style={{ fontWeight: 'bold', color: '#333', marginBottom: 4 }}>Viajes recientes</Text>
                <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={true}>
                  {history.map((h, idx) => (
                    <TouchableOpacity key={idx} style={{ padding: 7, borderRadius: 7, backgroundColor: '#f1f8e9', marginBottom: 5 }} onPress={() => { setOrigin(h.origin); setDestination(h.destination); }}>
                      <Text style={{ color: '#333' }}>{h.origin} → {h.destination}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {loadingRoute && <ActivityIndicator size="small" color="#2196f3" style={{ marginTop: 10 }} />}
            {error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
          </View>
        )}

        {/* Información del viaje actual */}
        {routeInfo && routeHeader.start && routeHeader.end && (
          <View style={styles.routeInfo}>
            <Text style={[styles.routeTitle, getTextStyle()]}>Ruta: {routeHeader.start} → {routeHeader.end}</Text>
            <Text style={[styles.routeTime, getTextStyle()]}>Duración estimada: {routeInfo.duration}</Text>
          </View>
        )}

        {/* Mapa con la ruta */}
        {routeSteps.length > 0 && (
          <View style={styles.map}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: routeInfo.origin.latitude,
                longitude: routeInfo.origin.longitude,
                latitudeDelta: Math.abs(routeInfo.destination.latitude - routeInfo.origin.latitude) + 0.08,
                longitudeDelta: Math.abs(routeInfo.destination.longitude - routeInfo.origin.longitude) + 0.08,
              }}
            >
              <Polyline
                coordinates={routeInfo.polyline}
                strokeColor="#1976d2"
                strokeWidth={6}
              />
              <Marker
                coordinate={routeInfo.origin}
                title="Origen"
                description={routeHeader.start}
                pinColor="green"
              />
              <Marker
                coordinate={routeInfo.destination}
                title="Destino"
                description={routeHeader.end}
                pinColor="red"
              />
              {relevantReports.map((report) => (
                <Marker
                  key={report.id}
                  coordinate={report.coords}
                  pinColor="orange"
                  title={`Reporte: ${report.type}`}
                >
                  <Callout>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{report.location}</Text>
                      <Text style={styles.calloutDescription}>{report.description}</Text>
                      {report.imageUrl && (
                        <Image source={{ uri: report.imageUrl }} style={styles.calloutImage} />
                      )}
                      <Text style={styles.calloutConfirmations}>
                        <Ionicons name="checkmark-circle" size={14} color="#4caf50" /> {report.confirmations || 0} confirmaciones
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
              {currentUserLocation && (
                <Marker
                  coordinate={currentUserLocation}
                  title="Mi Ubicación"
                  pinColor="blue"
                >
                  <View style={styles.userLocationMarker} />
                </Marker>
              )}
            </MapView>
          </View>
        )}

        {/* Barra de progreso */}
        {routeSteps.length > 0 && (
          <View style={styles.progressBarContainer}>
            <Text style={[styles.progressText, getTextStyle()]}>Paso {currentStep} de {routeSteps.length}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(currentStep / routeSteps.length) * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Paso actual */}
        {routeSteps.length > 0 && currentStep > 0 && currentStep <= routeSteps.length && (() => {
          const step = routeSteps[currentStep - 1];
          // Icono y color según tipo
          let iconName = 'walk';
          let iconColor = '#1976d2';
          let bgColor = '#e3f2fd';
          let borderColor = '#1976d2';
          if (step.tipo === 'transporte' || step.instruccion?.toLowerCase().includes('toma')) {
            iconName = 'bus';
            iconColor = step.colorLinea || '#fff';
            bgColor = step.colorLinea || '#e3f2fd';
            borderColor = step.colorLinea || '#1976d2';
            if (step.icono && step.icono.includes('rail')) iconName = 'train';
            if (step.icono && step.icono.includes('subway')) iconName = 'subway';
          }
          // Mejora de legibilidad y consistencia para pasos
          let instruccion = step.instruccion || step.text || step.detalle || 'Sigue al siguiente punto';
          let accion = '';
          let distanciaTiempo = '';
          let instruccionPrincipal = '';
          let detalleExtra = '';
          // Regex para extraer acción, distancia/tiempo y resto
          const match = instruccion.match(/^(?:([\p{Emoji_Presentation}\p{Emoji}\uFE0F]+)\s*)?(Camina|Gira a la derecha|Gira a la izquierda|Dirígete|Toma|Sigue|Continúa|Sube|Baja|Cruza|Avanza|Mantente|Sigue recto|Autobús|Metro|Tren|Subte|\w+)?\s*([0-9]+m)?\s*(\([0-9]+s\))?[:\-]?\s*(.*)$/u);
          if (match) {
            accion = (match[2] || '').trim();
            distanciaTiempo = [match[3], match[4]].filter(Boolean).join(' ');
            instruccionPrincipal = (match[5] || '').split('.')[0];
            detalleExtra = (match[5] || '').split('.').slice(1).join('.').trim();
          } else {
            instruccionPrincipal = instruccion;
          }
          // Emoji solo si la acción es 'Camina' y la instrucción NO empieza con 🚶
          let emoji = '';
          if (accion.toLowerCase() === 'camina' && !/^\s*🚶/.test(instruccion)) {
            emoji = '🚶 ';
          }
          // Colores accesibles
          const cardBg = step.tipo === 'transporte' ? '#215aae' : '#1976d2';
          const textMain = { color: '#fff', fontWeight: 'bold', fontSize: 22 };
          const textSecondary = { color: 'rgba(255,255,255,0.85)', fontSize: 16 };
          const salidaColor = { color: '#ffe082', fontWeight: 'bold' };
          const llegadaColor = { color: '#b9f6ca', fontWeight: 'bold' };
          const paradasColor = { color: '#fff', fontWeight: 'bold' };
          return (
            <View style={[
              styles.currentStepContainer,
              getStepStyle(),
              { borderLeftWidth: 8, borderLeftColor: borderColor, backgroundColor: cardBg, marginBottom: 10 }
            ]}>
              <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 18, marginBottom: 2, lineHeight: 24 }}>
                  {emoji}
                  {accion && <Text style={{ color: '#ffe082', fontWeight: 'bold' }}>{accion}</Text>}
                  {distanciaTiempo && <Text style={{ color: '#fff', fontWeight: 'bold' }}> {distanciaTiempo}</Text>}
                </Text>
                {instruccionPrincipal ? (
                  <Text style={{ color: '#fff', fontSize: 17, lineHeight: 25, textAlign: 'left', marginBottom: 2 }}>{instruccionPrincipal}</Text>
                ) : null}
                {detalleExtra ? (
                  <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22, textAlign: 'left', opacity: 0.85 }}>{detalleExtra}</Text>
                ) : null}
              </View>
              {step.detalle && step.detalle !== instruccion ? (
                <Text style={[styles.stepDetail, textSecondary]}> {step.detalle} </Text>
              ) : null}
              {(step.horaSalida || step.horaLlegada) && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  {step.horaSalida && <Text style={salidaColor}>Salida: {step.horaSalida}</Text>}
                  {step.horaLlegada && <Text style={llegadaColor}>Llegada: {step.horaLlegada}</Text>}
                </View>
              )}
              {step.tipo === 'transporte' && step.stopCount !== undefined && (
                <Text style={paradasColor}>Paradas: {step.stopCount}</Text>
              )}
              {step.tipo === 'transporte' && step.icono && (
                <Image source={{ uri: step.icono.startsWith('http') ? step.icono : `https:${step.icono}` }} style={{ width: 36, height: 36, marginBottom: 6, tintColor: iconColor }} />
              )}
              {step.accessibility && (
                <View style={[styles.accessibilityAlert, { backgroundColor: '#fff', borderColor: '#4caf50', borderWidth: 1 }]}> 
                  <Ionicons name="information-circle" size={20} color="#4caf50" />
                  <Text style={[styles.accessibilityText, { color: '#388e3c', fontWeight: 'bold' }]}>{step.accessibility}</Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Botones de acción de pasos */}
        {routeSteps.length > 0 && (
          <View style={[styles.actionButtons, { paddingBottom: (insets.bottom || 16) + 4 }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.repeatButton, userType === 'visual' && getVisualRepeatButton()]}
              onPress={() => { vibrateIfEnabled(); handlePrevStep(); }}
              disabled={currentStep === 1}
              accessibilityLabel="Paso anterior"
              accessibilityHint="Toca para volver al paso anterior"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text style={[styles.buttonText, userType === 'visual' && getVisualText()]}>Anterior</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.nextButton, userType === 'visual' && getVisualNextButton()]}
              onPress={() => { 
                vibrateIfEnabled(); 
                if (currentStep < routeSteps.length) {
                  handleNextStep();
                } else {
                  handleCancelRoute();
                }
              }}
              accessibilityLabel="Siguiente paso"
              accessibilityHint="Toca para avanzar al siguiente paso o finalizar el viaje"
            >
              <Ionicons name="arrow-forward" size={24} color="white" />
              <Text style={[styles.buttonText, userType === 'visual' && getVisualText()]}> 
                {currentStep < routeSteps.length ? 'Siguiente Paso' : 'Finalizar Viaje'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, userType === 'visual' && getVisualCancelButton()]}
              onPress={() => { vibrateIfEnabled(); handleCancelRoute(); }}
              accessibilityLabel="Cancelar viaje"
              accessibilityHint="Toca para cancelar el viaje y volver a buscar una nueva ruta"
            >
              <Ionicons name="close-circle" size={24} color="white" />
              <Text style={[styles.buttonText, userType === 'visual' && getVisualText()]}>Cancelar Viaje</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Alertas de servicio */}
        <View style={styles.alertsContainer}>
          <Text style={[styles.alertsTitle, getTextStyle()]}>Reportes Recientes</Text>
          {routeSteps.length === 0 ? (
            <Text style={{ color: '#999', fontStyle: 'italic' }}>Primero planifica una ruta para ver reportes cercanos a tu trayecto.</Text>
          ) : relevantReports.length === 0 ? (
            <Text style={{ color: '#999', fontStyle: 'italic' }}>No hay reportes cercanos a este paso.</Text>
          ) : (
            relevantReports.map((report, idx) => (
              <View key={report.id || idx} style={styles.alertItem}>
                <Ionicons name="warning" size={20} color="#ff9800" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertText}>{report.type.charAt(0).toUpperCase() + report.type.slice(1)}</Text>
                  <Text style={styles.alertTime}>{report.location}</Text>
                  <Text style={styles.alertText}>{report.description}</Text>
                  <Text style={styles.alertConfirmations}>✓ {report.confirmations || 0} confirmaciones</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Botón de emergencia para usuarios con discapacidades */}
        {(userType === 'visual' || userType === 'motor') && (
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => {
              // Mejorar el contexto para el chatbot
              let contexto = '';
              const descripcionInterfaz = `INSTRUCCIONES PARA LA IA: Esta app tiene una pantalla para planificar viajes en transporte público. El usuario debe ingresar el ORIGEN y DESTINO en campos de texto, puede usar el botón de mapa para seleccionar en el mapa, y luego debe pulsar el botón 'Buscar Ruta' para ver las opciones. Hay botones para guardar favoritos y ver historial. SOLO debes guiar sobre cómo usar estos elementos de la interfaz, no inventes funciones que la app no tiene.`;
              if (routeSteps.length > 0 && currentStep > 0 && currentStep <= routeSteps.length) {
                const step = routeSteps[currentStep - 1];
                const instruccion = step?.instruccion || step?.text || 'Sin instrucción disponible';
                const detalle = step?.detalle ? step.detalle : 'Sin detalle adicional.';
                contexto = `${descripcionInterfaz}\n\nNecesito asistencia para continuar mi viaje en transporte público.\n\nInformación de mi viaje:\n- Origen: ${origin || 'No especificado'}\n- Destino: ${destination || 'No especificado'}\n- Paso actual: ${currentStep} de ${routeSteps.length}\n- Instrucción actual: ${instruccion}\n- Detalle: ${detalle}\n- Tipo de usuario: ${userType || 'No especificado'}\n\nPor favor, guíame paso a paso o ayúdame si hay algún problema en este punto.`;
              } else {
                contexto = `${descripcionInterfaz}\n\nQuiero planificar un viaje en transporte público pero necesito ayuda.\n- Tipo de usuario: ${userType || 'No especificado'}\n\nPor favor, guíame paso a paso para ingresar el origen, destino y elegir la mejor ruta según mis necesidades de accesibilidad.`;
              }
              navigation.navigate('Chat', { asistenciaContexto: contexto });
            }}
          >
            <Ionicons name="help-circle" size={24} color="white" />
            <Text style={styles.emergencyText}>Solicitar Asistencia</Text>
          </TouchableOpacity>
        )}

        {/* Modal de selección de rutas alternativas */}
        {showRoutesModal && (
          <Modal
            visible={showRoutesModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowRoutesModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '92%', backgroundColor: '#fff', borderRadius: 18, padding: 18, elevation: 6 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2', marginBottom: 10 }}>Elige una ruta</Text>
                <ScrollView style={{ maxHeight: 350 }}>
                  {routeOptions.map((route, idx) => {
                    const duration = route.localizedValues?.duration?.text || '';
                    const steps = route.legs[0].steps;
                    const transbordos = steps.filter(s => s.travelMode === 'TRANSIT').length;
                    const resumen = steps.map(s => s.travelMode === 'TRANSIT' ? `🚌 ${s.transitDetails?.transitLine?.nameShort || ''}` : '🚶').join(' → ');
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={{ padding: 14, borderRadius: 10, backgroundColor: '#e3f2fd', marginBottom: 10, borderWidth: 2, borderColor: '#1976d2' }}
                        onPress={() => handleSelectRoute(route)}
                        accessibilityLabel={`Seleccionar ruta ${idx + 1}`}
                      >
                        <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 16 }}>Ruta {idx + 1} - {duration}</Text>
                        <Text style={{ color: '#333', marginTop: 2 }}>Transbordos: {transbordos}</Text>
                        <Text style={{ color: '#333', marginTop: 2 }}>{resumen}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity onPress={() => setShowRoutesModal(false)} style={{ marginTop: 10, alignSelf: 'center', padding: 10 }}>
                  <Text style={{ color: '#f44336', fontWeight: 'bold' }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  darkTheme: {
    backgroundColor: '#000',
  },
  whiteText: {
    color: '#fff',
  },
  yellowText: {
    color: '#ffe082',
  },
  darkInput: {
    backgroundColor: '#111',
    borderColor: '#ffe082',
    color: '#ffe082',
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
    borderColor: undefined,
    borderWidth: 0,
  },
  accessibilityText: {
    fontSize: 14,
    color: '#4caf50',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 10,
    alignItems: 'stretch',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    borderRadius: 16,
    elevation: 2,
    marginHorizontal: 5,
    minWidth: 0,
    backgroundColor: '#222',
    borderColor: '#ffe082',
    borderWidth: 0,
  },
  repeatButton: {
    backgroundColor: '#ff9800',
    borderColor: undefined,
    borderWidth: 0,
  },
  nextButton: {
    backgroundColor: '#4caf50',
    borderColor: undefined,
    borderWidth: 0,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    borderColor: undefined,
    borderWidth: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    flexShrink: 1,
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
  textInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  largeInput: {
    padding: 15,
  },
  progressBarContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 0,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#4caf50',
    borderRadius: 4,
  },
  map: {
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  calloutContainer: {
    width: 200,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 14,
  },
  calloutImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  calloutConfirmations: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 5,
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(0, 122, 255, 0.7)',
  },
});

export default NavigationScreen;