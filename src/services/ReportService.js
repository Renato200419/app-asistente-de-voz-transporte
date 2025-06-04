import AsyncStorage from '@react-native-async-storage/async-storage';

export const ReportService = {
  // Guardar reporte con imagen
  saveReport: async (report) => {
    try {
      const reports = await AsyncStorage.getItem('accessibilityReports');
      const existingReports = reports ? JSON.parse(reports) : [];
      
      const newReport = {
        id: Date.now(),
        ...report,
        timestamp: new Date().toISOString(),
        confirmations: 0
      };
      
      existingReports.unshift(newReport);
      await AsyncStorage.setItem('accessibilityReports', JSON.stringify(existingReports));
      
      return newReport;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  },

  // Obtener reportes recientes
  getRecentReports: async (limit = 10) => {
    try {
      const reports = await AsyncStorage.getItem('accessibilityReports');
      if (!reports) return [];
      
      const parsed = JSON.parse(reports);
      return parsed.slice(0, limit);
    } catch (error) {
      console.error('Error getting reports:', error);
      return [];
    }
  },

  // Confirmar un reporte
  confirmReport: async (reportId) => {
    try {
      const reports = await AsyncStorage.getItem('accessibilityReports');
      if (!reports) return;
      
      const parsed = JSON.parse(reports);
      const reportIndex = parsed.findIndex(r => r.id === reportId);
      
      if (reportIndex !== -1) {
        parsed[reportIndex].confirmations += 1;
        await AsyncStorage.setItem('accessibilityReports', JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Error confirming report:', error);
    }
  }
};