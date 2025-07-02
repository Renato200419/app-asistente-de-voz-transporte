# 🚌 Asistente de Voz para Transporte

Una aplicación móvil desarrollada con React Native y Expo que proporciona un asistente inteligente para ayudar a personas con discapacidades visuales y usuarios en general a navegar el transporte público de manera más eficiente y accesible.

## 📋 Descripción

Esta aplicación combina reconocimiento de voz, inteligencia artificial y servicios de mapas para ofrecer:

- **Planificación de rutas accesibles** con instrucciones de voz
- **Chat inteligente** con análisis de imágenes usando Gemini AI
- **Sistema de reportes** para problemas de accesibilidad
- **Navegación paso a paso** con alertas por voz
- **Configuración personalizable** de accesibilidad

### ✨ Características Principales

- 🎤 **Reconocimiento de voz** para entrada de comandos
- 🔊 **Síntesis de voz** para respuestas y navegación
- 📷 **Análisis de imágenes** con IA para identificar problemas de transporte
- 🗺️ **Mapas interactivos** con rutas en tiempo real
- 📱 **Interfaz accesible** con soporte para lectores de pantalla
- 🌐 **Sistema de reportes colaborativo** con Firebase
- ⚙️ **Configuraciones personalizables** de accesibilidad

## 🚀 Cómo Ejecutar la Aplicación

### Prerrequisitos

- Node.js (versión 16 o superior)
- npm o yarn
- Expo CLI
- Expo Go app en tu dispositivo móvil

### Instalación

1. **Clona o descarga el proyecto**:
   ```bash
   cd app-asistente-de-voz-transporte
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo**:
   ```bash
   npm start
   # o
   expo start
   ```

### Ejecutar con Expo Go

1. **Instala Expo Go** en tu dispositivo móvil:
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. **Escanea el código QR** que aparece en la terminal o en la página web que se abre automáticamente

3. **La aplicación se cargará** en tu dispositivo móvil

### Scripts Disponibles

```bash
npm start          # Inicia el servidor de desarrollo
npm run android    # Ejecuta en emulador Android
npm run ios        # Ejecuta en simulador iOS
npm run web        # Ejecuta en navegador web
```

## 📁 Estructura del Proyecto

```
app-asistente-de-voz-transporte/
├── App.js                          # Componente raíz y navegación principal
├── index.js                        # Punto de entrada de la aplicación
├── app.json                        # Configuración de Expo
├── package.json                    # Dependencias y scripts
├── assets/                         # Recursos estáticos
│   ├── icon.png                   # Icono de la aplicación
│   ├── adaptive-icon.png          # Icono adaptativo Android
│   ├── splash-icon.png            # Imagen de splash screen
│   └── favicon.png                # Favicon para web
└── src/                           # Código fuente
    ├── screens/                   # Pantallas de la aplicación
    │   ├── HomeScreen.js          # Pantalla principal con opciones
    │   ├── ChatScreen.js          # Chat con IA y análisis de imágenes
    │   ├── ConfigScreen.js        # Configuraciones de accesibilidad
    │   ├── NavigationScreen.js    # Navegación y mapas
    │   └── ReportScreen.js        # Sistema de reportes
    └── services/                  # Servicios y configuraciones
        ├── firebase.js            # Configuración de Firebase
        └── ReportService.js       # Servicio para manejo de reportes
```

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React Native** - Framework principal
- **Expo** - Plataforma de desarrollo
- **React Navigation** - Navegación entre pantallas

### Servicios de Voz
- **@react-native-voice/voice** - Reconocimiento de voz
- **expo-speech** - Síntesis de voz

### Mapas y Ubicación
- **react-native-maps** - Mapas interactivos
- **expo-location** - Servicios de geolocalización

### Inteligencia Artificial
- **Gemini AI** - Procesamiento de texto e imágenes

### Base de Datos
- **Firebase Firestore** - Base de datos NoSQL
- **Firebase Realtime Database** - Datos en tiempo real
- **Firebase Storage** - Almacenamiento de archivos

### Otras Dependencias
- **AsyncStorage** - Almacenamiento local
- **Expo Image Picker** - Selección de imágenes
- **Expo Vector Icons** - Iconografía

## 📱 Pantallas de la Aplicación

### 🏠 HomeScreen
- Pantalla principal con opciones de navegación
- Tutorial interactivo para nuevos usuarios
- Configuración rápida de tipo de usuario
- Acceso directo a todas las funcionalidades

### 💬 ChatScreen
- Chat inteligente con Gemini AI
- Reconocimiento de voz para entrada de texto
- Análisis de imágenes para identificar problemas
- Síntesis de voz para respuestas
- Historial de conversaciones

### ⚙️ ConfigScreen
- Configuraciones de accesibilidad personalizables
- Alertas de voz activables/desactivables
- Retroalimentación háptica
- Nivel de detalle en instrucciones
- Tiempo extra para navegación

### 🗺️ NavigationScreen
- Planificación de rutas accesibles
- Mapas interactivos con React Native Maps
- Navegación paso a paso con voz
- Autocompletado de direcciones
- Información de transporte público en tiempo real

### 📋 ReportScreen
- Sistema de reportes colaborativo
- Categorización de problemas de accesibilidad
- Subida de imágenes de evidencia
- Visualización de reportes cercanos
- Estado de reportes (abierto/resuelto)

## 🔧 Configuración

### Variables de Entorno
La aplicación utiliza las siguientes APIs que requieren configuración:

- **Gemini AI API Key** - Para el chat inteligente y análisis de imágenes
- **Firebase Configuration** - Para base de datos y almacenamiento

### Permisos
La aplicación requiere los siguientes permisos:

#### Android
- `CAMERA` - Para tomar fotos
- `WRITE_EXTERNAL_STORAGE` - Para guardar imágenes
- `READ_EXTERNAL_STORAGE` - Para acceder a la galería
- `RECORD_AUDIO` - Para reconocimiento de voz
- `MODIFY_AUDIO_SETTINGS` - Para configuraciones de audio

#### iOS
- `NSCameraUsageDescription` - Acceso a la cámara
- `NSPhotoLibraryUsageDescription` - Acceso a la galería
- `NSMicrophoneUsageDescription` - Acceso al micrófono
- `NSSpeechRecognitionUsageDescription` - Reconocimiento de voz

## 🎯 Funcionalidades de Accesibilidad

- **Reconocimiento de voz** para usuarios con dificultades motoras
- **Síntesis de voz** para usuarios con discapacidades visuales
- **Interfaz de alto contraste** y texto grande
- **Retroalimentación háptica** configurable
- **Navegación por gestos** simplificada
- **Comandos de voz** para todas las funciones principales

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

- Jorge Barriga
- Renato Olivera
- José Llanos

## 🆘 Soporte

Si tienes problemas con la aplicación:

1. Revisa que todas las dependencias estén instaladas correctamente
2. Verifica que tengas la versión correcta de Node.js y Expo CLI
3. Asegúrate de que los permisos estén concedidos en tu dispositivo
4. Revisa la consola para errores específicos

Para reportar bugs o solicitar características, por favor crea un issue en el repositorio del proyecto.