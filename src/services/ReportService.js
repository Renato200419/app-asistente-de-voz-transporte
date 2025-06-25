import { rtdb, storage } from './firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push, get, query, orderByChild, limitToLast, update, runTransaction, onValue } from 'firebase/database';
import { Alert } from 'react-native';

// Guarda un nuevo reporte en Realtime Database y Storage
/**
 * Guarda un nuevo reporte en la base de datos.
 * @param {Object} params
 * @param {string} params.location - Ubicación del reporte
 * @param {string} params.description - Descripción del problema
 * @param {'accesibilidad'|'trafico'|'infraestructura'|'seguridad'|'limpieza'|'otros'} params.type - Tipo de reporte
 * @param {string|null} params.image - URI de la imagen (opcional)
 * @param {{latitude: number, longitude: number}} params.coords - Coordenadas
 */
export async function saveReport({ location, description, type, image, coords }) {
  // Validar tipo
  const tiposValidos = ['accesibilidad', 'trafico', 'infraestructura', 'seguridad', 'limpieza', 'otros'];
  if (!tiposValidos.includes(type)) {
    throw new Error('Tipo de reporte no válido');
  }

  try {
    let imageUrl = null;
    // 1. Si hay una imagen, subirla a Firebase Storage
    if (image) {
      const response = await fetch(image);
      const blob = await response.blob();
      const imageName = `report_${Date.now()}.jpg`;
      const imageStorageRef = storageRef(storage, `reports/${imageName}`);
      
      await uploadBytes(imageStorageRef, blob);
      imageUrl = await getDownloadURL(imageStorageRef);
    }
    
    // 2. Preparar el objeto del reporte para la Realtime Database
    const reportData = {
      location,
      description,
      type,
      imageUrl, // Guardamos la URL de la imagen
      coords,   // { latitude, longitude }
      timestamp: Date.now(),
      confirmations: 0,
    };
    
    // 3. Guardar el reporte en la Realtime Database
    const reportsRef = dbRef(rtdb, 'reports');
    await push(reportsRef, reportData);
    
  } catch (error) {
    // Loguear el objeto de error completo para obtener más detalles del servidor
    console.error("Error detallado al guardar el reporte:", JSON.stringify(error, null, 2));
    Alert.alert("Error", "No se pudo guardar el reporte. Revisa la consola para más detalles.");
    throw error;
  }
}

// Obtiene los reportes más recientes de la Realtime Database usando onValue
export function getRecentReports() {
  return new Promise((resolve, reject) => {
    try {
      const reportsRef = dbRef(rtdb, 'reports');
      const recentReportsQuery = query(reportsRef, orderByChild('timestamp'), limitToLast(20));

      onValue(recentReportsQuery, (snapshot) => {
        if (snapshot.exists()) {
          const reports = [];
          snapshot.forEach(childSnapshot => {
            reports.push({
              id: childSnapshot.key,
              ...childSnapshot.val(),
            });
          });
          resolve(reports.reverse());
        } else {
          resolve([]);
        }
      }, (error) => {
        console.error("Error en onValue:", error);
        reject(error);
      }, { onlyOnce: true }); // Se ejecuta una sola vez, como get()

    } catch (error) {
      console.error("Error al obtener los reportes:", error);
      reject(error);
    }
  });
}

// Confirma un reporte (aumenta el contador de forma segura)
export async function confirmReport(reportId) {
  try {
    const reportRef = dbRef(rtdb, `reports/${reportId}`);
    
    // Usar una transacción para evitar problemas de concurrencia
    await runTransaction(reportRef, (report) => {
      if (report) {
        report.confirmations = (report.confirmations || 0) + 1;
      }
      return report;
    });
    
  } catch (error) {
    console.error("Error al confirmar el reporte:", error);
    Alert.alert("Error", "No se pudo confirmar el reporte.");
    throw error;
  }
}