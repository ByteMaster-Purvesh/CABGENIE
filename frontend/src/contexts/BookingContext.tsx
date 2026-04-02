import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

interface Location {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface CabProvider {
  name: string;
  providerId: string;
  vehicleType: string;
  fare: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    totalFare: number;
  };
  eta: number;
  rating: number;
  safety: {
    driverVerification: boolean;
    vehicleCondition: number;
    safetyFeatures: string[];
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  distance?: number;
  status?: 'available' | 'busy' | 'enroute';
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
}

interface BookingData {
  pickupLocation: Location;
  destination: Location;
  estimatedDistance: number;
  estimatedDuration: number;
  provider: CabProvider;
  vehicleType: string;
  fare: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    totalFare: number;
  };
  paymentMethod: 'wallet' | 'upi' | 'card' | 'cash';
}

interface BookingContextType {
  bookings: BookingData[];
  currentBooking: BookingData | null;
  searchResults: CabProvider[];
  isSearching: boolean;
  searchCabs: (pickup: Location, destination: Location, vehicleType?: string) => Promise<void>;
  selectCab: (provider: CabProvider) => void;
  createBooking: (bookingData: BookingData) => Promise<string>;
  clearSearch: () => void;
  getNearbyCabs: (pickup: Location, radius?: number) => Promise<CabProvider[]>;
  getCurrentLocation: () => Promise<{lat: number, lng: number} | null>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [currentBooking, setCurrentBooking] = useState<BookingData | null>(null);
  const [searchResults, setSearchResults] = useState<CabProvider[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchCabs = async (pickup: Location, destination: Location, vehicleType?: string) => {
    setIsSearching(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/cabs/search`, {
        pickupLocation: pickup,
        destination,
        vehicleType: vehicleType || 'sedan',
        maxFare: 1000,
        passengerCount: 1,
        aiAgent: true
      });

      setSearchResults(response.data.cabs || []);
    } catch (error) {
      console.error('Error searching cabs:', error);
      // Set mock data for demonstration
      setSearchResults([
        {
          name: 'Uber',
          providerId: 'uber_123',
          vehicleType: 'sedan',
          fare: { baseFare: 50, distanceFare: 150, timeFare: 30, totalFare: 230 },
          eta: 15,
          rating: 4.5,
          safety: { driverVerification: true, vehicleCondition: 4.5, safetyFeatures: ['GPS', 'Emergency Button'] }
        },
        {
          name: 'Ola',
          providerId: 'ola_456',
          vehicleType: 'sedan',
          fare: { baseFare: 45, distanceFare: 140, timeFare: 25, totalFare: 210 },
          eta: 12,
          rating: 4.3,
          safety: { driverVerification: true, vehicleCondition: 4.2, safetyFeatures: ['GPS'] }
        },
        {
          name: 'CABGENIE',
          providerId: 'cabgenie_789',
          vehicleType: 'sedan',
          fare: { baseFare: 40, distanceFare: 130, timeFare: 20, totalFare: 190 },
          eta: 10,
          rating: 4.7,
          safety: { driverVerification: true, vehicleCondition: 4.8, safetyFeatures: ['GPS', 'Emergency Button', 'Live Tracking'] }
        }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectCab = (provider: CabProvider) => {
    if (currentBooking) {
      setCurrentBooking({
        ...currentBooking,
        provider,
        fare: provider.fare
      });
    }
  };

  const createBooking = async (bookingData: BookingData): Promise<string> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/bookings/create`, bookingData);
      
      if (response.data.booking) {
        setCurrentBooking(bookingData);
        // Add the booking to the bookings history
        setBookings(prev => [...prev, bookingData]);
        return response.data.booking.bookingId;
      }
      
      throw new Error('Booking creation failed');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Booking creation failed');
      }
      throw new Error('Network error. Please try again.');
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
    setIsSearching(false);
  };

  const getNearbyCabs = async (pickup: Location, radius: number = 5): Promise<CabProvider[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cabs/nearby`, {
        params: {
          lat: pickup.coordinates.lat,
          lng: pickup.coordinates.lng,
          radius
        }
      });
      return response.data.cabs || [];
    } catch (error) {
      console.error('Error fetching nearby cabs:', error);
      // Return mock data for demonstration
      return [
        {
          name: 'Uber',
          providerId: 'uber_123',
          vehicleType: 'sedan',
          fare: { baseFare: 50, distanceFare: 150, timeFare: 30, totalFare: 230 },
          eta: 15,
          rating: 4.5,
          safety: { driverVerification: true, vehicleCondition: 4.5, safetyFeatures: ['GPS', 'Emergency Button'] },
          coordinates: { lat: pickup.coordinates.lat + 0.01, lng: pickup.coordinates.lng + 0.01 },
          distance: 1.2,
          status: 'available' as const,
          driverName: 'Ramesh Kumar',
          driverPhone: '+91 98765 43210',
          vehicleNumber: 'MH 01 AB 1234'
        },
        {
          name: 'Ola',
          providerId: 'ola_456',
          vehicleType: 'mini',
          fare: { baseFare: 45, distanceFare: 140, timeFare: 25, totalFare: 210 },
          eta: 12,
          rating: 4.3,
          safety: { driverVerification: true, vehicleCondition: 4.2, safetyFeatures: ['GPS'] },
          coordinates: { lat: pickup.coordinates.lat - 0.01, lng: pickup.coordinates.lng + 0.02 },
          distance: 1.8,
          status: 'available' as const,
          driverName: 'Suresh Patel',
          driverPhone: '+91 98765 43211',
          vehicleNumber: 'MH 02 CD 5678'
        }
      ];
    }
  };

  const getCurrentLocation = (): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting current location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  const value: BookingContextType = {
    bookings,
    currentBooking,
    searchResults,
    isSearching,
    searchCabs,
    selectCab,
    createBooking,
    clearSearch,
    getNearbyCabs,
    getCurrentLocation,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};