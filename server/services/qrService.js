import QRCode from 'qrcode';

export const generateQrCodes = async (bookingData) => {
  const entryPayload = JSON.stringify({
    type: 'ENTRY',
    bookingCode: bookingData.bookingCode,
    slotNumber: bookingData.slotNumber,
    vehicleNumber: bookingData.vehicleNumber,
    startTime: bookingData.startTime,
    venueId: bookingData.venueId
  });

  const exitPayload = JSON.stringify({
    type: 'EXIT',
    bookingCode: bookingData.bookingCode,
    slotNumber: bookingData.slotNumber,
    vehicleNumber: bookingData.vehicleNumber,
    endTime: bookingData.endTime,
    venueId: bookingData.venueId
  });

  const entryQrImage = await QRCode.toDataURL(entryPayload, {
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#10b981', // green for entry
      light: '#0f172a'  // dark background
    }
  });

  const exitQrImage = await QRCode.toDataURL(exitPayload, {
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#f43f5e', // red/rose for exit
      light: '#0f172a'
    }
  });

  return {
    entryQrData: entryPayload,
    exitQrData: exitPayload,
    entryQrImage,
    exitQrImage
  };
};
