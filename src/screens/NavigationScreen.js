import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, Vibration, Image, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Keyboard } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';

const GOOGLE_MAPS_API_KEY = 'SECRET';
const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const LOCATION_PLACEHOLDER = 'Mi ubicación actual';

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

  useEffect(() => {
    loadUserConfig();
    loadHistory();
    loadFavorites();
  }, []);

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
    try {
      let originParam = origin;
      if (useCurrentLocation || origin === LOCATION_PLACEHOLDER) {
        const loc = await getCurrentLocationString();
        if (!loc) {
          setError('No se pudo obtener la ubicación actual. Activa el GPS e inténtalo de nuevo.');
          setLoadingRoute(false);
          return;
        }
        originParam = loc;
      }
      if (!originParam || !destination) {
        setError('Por favor ingresa origen y destino');
        setLoadingRoute(false);
        return;
      }
      await saveHistory(originParam, destination);
      // Logs para depuración de valores de origen y destino
      console.log('Valor recibido para originParam:', originParam);
      console.log('Valor recibido para destination:', destination);
      // Validación extra para evitar nulls y rangos inválidos
      const parseLocation = (param) => {
        console.log('parseLocation recibe:', param);
        // Detectar si es coordenada: solo si son dos números separados por coma
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
            console.log('parseLocation lat:', latitude, 'lng:', longitude);
            if (
              latitude < -90 || latitude > 90 ||
              longitude < -180 || longitude > 180
            ) {
              throw new Error('Coordenadas inválidas');
            }
            return { location: { latLng: { latitude, longitude } } };
          }
        }
        if (!param || param.trim() === '') {
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
        setLoadingRoute(false);
        return;
      }
      console.log('Body enviado a la API:', JSON.stringify(body, null, 2));
      const response = await fetch(GOOGLE_ROUTES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.legs.steps.transitDetails,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.polyline,routes.legs.steps.travelMode,routes.travelAdvisory.transitFare,routes.localizedValues'
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!data.routes || !data.routes.length) {
        console.log('Respuesta completa de la API de rutas:', data);
        let apiError = data.error?.message || data.error?.status || data.status || data.message;
        setError(apiError ? `Error de la API: ${apiError}` : 'No se encontró una ruta. Intenta con direcciones más específicas.');
        setLoadingRoute(false);
        return;
      }
      const leg = data.routes[0].legs[0];
      const steps = await Promise.all(leg.steps.map(async (step, idx) => {
        if (step.travelMode === 'TRANSIT' && step.transitDetails) {
          return {
            tipo: 'transporte',
            instruccion: `Toma ${step.transitDetails.transitLine?.vehicle?.name?.text || 'transporte'} ${step.transitDetails.transitLine?.nameShort || ''} (${step.transitDetails.transitLine?.name || ''}) hacia ${step.transitDetails.headsign || ''}`,
            detalle: `Desde ${step.transitDetails.stopDetails?.departureStop?.name || ''} hasta ${step.transitDetails.stopDetails?.arrivalStop?.name || ''} (${step.transitDetails.stopCount || 0} paradas)`,
            colorLinea: step.transitDetails.transitLine?.color,
            icono: step.transitDetails.transitLine?.vehicle?.iconUri,
            horaSalida: step.transitDetails.localizedValues?.departureTime?.time?.text,
            horaLlegada: step.transitDetails.localizedValues?.arrivalTime?.time?.text,
            stopCount: step.transitDetails.stopCount,
            polilinea: step.polyline?.encodedPolyline,
            accessibility: userType === 'motor' ? 'Verifica accesibilidad en la ruta peatonal' : null
          };
        } else if (step.travelMode === 'WALK') {
          // Paso de caminata detallado
          let detalle = '';
          if (step.navigationInstruction && step.navigationInstruction.instructions) {
            detalle = step.navigationInstruction.instructions;
          } else if (step.startLocation && step.endLocation) {
            // Geocodificación inversa para direcciones legibles
            const start = await getAddressFromCoords(
              step.startLocation.latLng.latitude,
              step.startLocation.latLng.longitude
            );
            const end = await getAddressFromCoords(
              step.endLocation.latLng.latitude,
              step.endLocation.latLng.longitude
            );
            detalle = `Desde: ${start}\nHasta: ${end}`;
          } else {
            detalle = 'Camina hasta el siguiente punto';
          }
          return {
            tipo: 'caminar',
            instruccion: 'Camina hasta el siguiente punto',
            detalle,
            polilinea: step.polyline?.encodedPolyline,
            accessibility: userType === 'motor' ? 'Verifica accesibilidad en la ruta peatonal' : null
          };
        } else {
          return {
            tipo: step.travelMode,
            instruccion: step.travelMode,
            detalle: '',
            polilinea: step.polyline?.encodedPolyline,
            accessibility: userType === 'motor' ? 'Verifica accesibilidad en la ruta peatonal' : null
          };
        }
      }));
      setRouteSteps(steps);
      // Cabecera profesional: direcciones legibles
      let startHeader = origin;
      let endHeader = destination;
      // Si el origen es coordenada, geocodifica
      if (typeof originParam === 'string') {
        const parts = originParam.split(',').map(p => p.trim());
        if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
          startHeader = await getAddressFromCoords(Number(parts[0]), Number(parts[1]));
        }
      }
      // Si el destino es coordenada, geocodifica
      if (typeof destination === 'string') {
        const parts = destination.split(',').map(p => p.trim());
        if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
          endHeader = await getAddressFromCoords(Number(parts[0]), Number(parts[1]));
        }
      }
      setRouteHeader({ start: startHeader, end: endHeader });
      setRouteInfo({
        summary: '', // La API moderna no siempre da summary
        duration: data.routes[0].localizedValues?.duration?.text || '',
        start: startHeader,
        end: endHeader
      });
    } catch (e) {
      setError('Error al buscar la ruta. Intenta de nuevo.');
    }
    setLoadingRoute(false);
  };

  const currentStepData = routeSteps.length > 0 ? routeSteps[currentStep - 1] : null;
  const totalSteps = routeSteps.length;

  const handleNextStep = () => {
    if (currentStep < routeSteps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finalizar viaje: reiniciar pantalla
      handleCancelRoute();
      Alert.alert('¡Viaje Completado!', 'Has llegado a tu destino.');
      if (userType === 'visual' && preferences && preferences.voiceAlerts) {
        Speech.speak('¡Viaje completado! Has llegado a tu destino.', { language: 'es' });
      }
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
    if (userType === 'visual' && text) {
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
      if (userType === 'visual') {
        speakStep(step.instruccion);
      }
    }
    // eslint-disable-next-line
  }, [currentStep, routeSteps]);

  // Cancelar viaje y volver a buscar
  const handleCancelRoute = () => {
    setRouteSteps([]);
    setRouteInfo(null);
    setCurrentStep(1);
    setOrigin('');
    setDestination('');
    setUseCurrentLocation(false);
    setError(null);
    Speech.stop();
    if (userType === 'visual' && preferences && preferences.voiceAlerts) {
      Speech.speak('Viaje cancelado. Puedes buscar una nueva ruta.', { language: 'es' });
    }
  };

  // Paso anterior
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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

  return (
    <SafeAreaView style={[styles.safeArea, styles.container, userType === 'visual' && styles.darkTheme, { paddingBottom: insets.bottom || 16 }]} edges={['bottom', 'left', 'right', 'top']}>
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
            <TextInput
              style={[styles.textInput, userType === 'elderly' && styles.largeInput, userType === 'visual' && getVisualInput()]}
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
            {showOriginSuggestions && originSuggestions.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 8, elevation: 2, marginTop: 2, marginBottom: 6 }}>
                {originSuggestions.map((s, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { setOrigin(s); setShowOriginSuggestions(false); }} style={{ padding: 10, borderBottomWidth: idx < originSuggestions.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                    <Text style={{ color: '#333' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
            <TextInput
              style={[styles.textInput, userType === 'elderly' && styles.largeInput, userType === 'visual' && getVisualInput()]}
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
            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderRadius: 8, elevation: 2, marginTop: 2, marginBottom: 6 }}>
                {destinationSuggestions.map((s, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { setDestination(s); setShowDestinationSuggestions(false); }} style={{ padding: 10, borderBottomWidth: idx < destinationSuggestions.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                    <Text style={{ color: '#333' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
        {routeInfo && (
          <View style={styles.routeInfo}>
            <Text style={[styles.routeTitle, getTextStyle()]}>Ruta: {routeInfo.start} → {routeInfo.end}</Text>
            <Text style={[styles.routeTime, getTextStyle()]}>Duración estimada: {routeInfo.duration}</Text>
          </View>
        )}

        {/* Mapa con la ruta */}
        {routeSteps.length > 0 && (
          <View style={{ height: 260, marginHorizontal: 20, marginBottom: 10, borderRadius: 15, overflow: 'hidden', elevation: 2 }}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: (() => {
                  // Busca el primer punto válido de la ruta
                  for (let step of routeSteps) {
                    if (step.polilinea) {
                      const points = decodePolyline(step.polilinea);
                      if (points.length > 0) return points[0].latitude;
                    }
                  }
                  return -12.0464; // Lima centro fallback
                })(),
                longitude: (() => {
                  for (let step of routeSteps) {
                    if (step.polilinea) {
                      const points = decodePolyline(step.polilinea);
                      if (points.length > 0) return points[0].longitude;
                    }
                  }
                  return -77.0428;
                })(),
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {/* Polilínea de toda la ruta */}
              {routeSteps.map((step, idx) => (
                step.polilinea ? (
                  <Polyline
                    key={idx}
                    coordinates={decodePolyline(step.polilinea)}
                    strokeColor={step.tipo === 'caminar' ? '#1976d2' : (step.colorLinea || '#43a047')}
                    strokeWidth={step.tipo === 'caminar' ? 4 : 6}
                  />
                ) : null
              ))}
              {/* Marcador de origen */}
              {routeSteps[0]?.polilinea && (
                <Marker
                  coordinate={decodePolyline(routeSteps[0].polilinea)[0]}
                  title="Origen"
                  pinColor="#1976d2"
                />
              )}
              {/* Marcador de destino */}
              {(() => {
                // Busca el último punto válido de la última polilínea
                for (let i = routeSteps.length - 1; i >= 0; i--) {
                  if (routeSteps[i].polilinea) {
                    const points = decodePolyline(routeSteps[i].polilinea);
                    if (points.length > 0) {
                      return (
                        <Marker
                          coordinate={points[points.length - 1]}
                          title="Destino"
                          pinColor="#c62828"
                        />
                      );
                    }
                  }
                }
                return null;
              })()}
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
          return (
            <View style={[
              styles.currentStepContainer,
              getStepStyle(),
              { borderLeftWidth: 8, borderLeftColor: borderColor, backgroundColor: bgColor, marginBottom: 10 }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name={iconName} size={38} color={iconColor} style={{ marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepInstruction, userType === 'visual' && getVisualText(), { fontSize: 20, fontWeight: 'bold' }]}> {step.instruccion} </Text>
                  {step.detalle ? (
                    <Text style={[styles.stepDetail, userType === 'visual' && getVisualText(), { fontSize: 16 }]}> {step.detalle} </Text>
                  ) : null}
                </View>
              </View>
              {(step.horaSalida || step.horaLlegada) && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  {step.horaSalida && <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Salida: {step.horaSalida}</Text>}
                  {step.horaLlegada && <Text style={{ color: '#388e3c', fontWeight: 'bold' }}>Llegada: {step.horaLlegada}</Text>}
                </View>
              )}
              {step.tipo === 'transporte' && step.stopCount !== undefined && (
                <Text style={{ color: '#555', marginBottom: 4 }}>Paradas: {step.stopCount}</Text>
              )}
              {step.tipo === 'transporte' && step.icono && (
                <Image source={{ uri: step.icono.startsWith('http') ? step.icono : `https:${step.icono}` }} style={{ width: 36, height: 36, marginBottom: 6 }} />
              )}
              {step.accessibility && (
                <View style={[styles.accessibilityAlert, userType === 'visual' && getVisualAlert()]}> 
                  <Ionicons name="information-circle" size={20} color="#4caf50" />
                  <Text style={[styles.accessibilityText, userType === 'visual' && getVisualText()]}>{step.accessibility}</Text>
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
              onPress={() => { vibrateIfEnabled(); handleNextStep(); }}
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
            onPress={() => {
              // Llevar a Chat con contexto del paso actual
              let contexto = '';
              if (routeSteps.length > 0 && currentStep > 0 && currentStep <= routeSteps.length) {
                const step = routeSteps[currentStep - 1];
                contexto = `Estoy en el paso ${currentStep} de mi ruta: ${step.instruccion}. Detalle: ${step.detalle || ''}`;
              } else {
                contexto = 'Necesito asistencia durante mi viaje en transporte público.';
              }
              navigation.navigate('Chat', { asistenciaContexto: contexto });
            }}
          >
            <Ionicons name="help-circle" size={24} color="white" />
            <Text style={styles.emergencyText}>Solicitar Asistencia</Text>
          </TouchableOpacity>
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
});

export default NavigationScreen;