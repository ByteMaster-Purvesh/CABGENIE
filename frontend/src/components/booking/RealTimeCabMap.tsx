import React, { useState, useEffect, useRef } from 'react';
import { Car, RefreshCw, MapPin, AlertCircle, Clock } from 'lucide-react';

interface CabLocation {
  id: string;
  provider: string;
  type: string;
  lat: number;
  lng: number;
  distance: number;
  eta: number;
  status: 'available' | 'busy' | 'enroute';
  driverName?: string;
  rating?: number;
}

interface RealTimeCabMapProps {
  pickupLocation?: { lat: number; lng: number };
  radius?: number; // radius in kilometers
  onCabSelect?: (cab: CabLocation) => void;
  aiAgentMode?: boolean;
  destination?: { lat: number; lng: number } | null;
}

const RealTimeCabMap: React.FC<RealTimeCabMapProps> = ({ 
  pickupLocation, 
  radius = 5, 
  onCabSelect,
  aiAgentMode = false,
  destination
}) => {
  const [availableCabs, setAvailableCabs] = useState<CabLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCab, setSelectedCab] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mock cab data generator based on pickup location
  const generateMockCabs = (center: { lat: number; lng: number }, radiusKm: number, destination?: { lat: number; lng: number } | null): CabLocation[] => {
    const providers = ['Uber', 'Ola', 'Meru', 'Mega', 'CABGENIE'];
    const types = ['Mini', 'Sedan', 'SUV', 'Micro', 'Premium'];
    const cabs: CabLocation[] = [];

    // Generate exactly 10 cabs within radius
    for (let i = 0; i < 10; i++) {
      let randomLat, randomLng;
      
      if (destination && aiAgentMode) {
        // Position cabs along the route between pickup and destination
        const routeProgress = Math.random();
        randomLat = center.lat + (destination.lat - center.lat) * routeProgress * 0.3; // Keep within 30% of route
        randomLng = center.lng + (destination.lng - center.lng) * routeProgress * 0.3;
        
        // Add some randomness around the route
        randomLat += (Math.random() - 0.5) * 0.01;
        randomLng += (Math.random() - 0.5) * 0.01;
      } else {
        // Random location within radius around pickup
        randomLat = center.lat + (Math.random() - 0.5) * (radiusKm * 0.02);
        randomLng = center.lng + (Math.random() - 0.5) * (radiusKm * 0.02);
      }
      
      // Calculate distance (simplified)
      const distance = Math.sqrt(
        Math.pow(randomLat - center.lat, 2) + Math.pow(randomLng - center.lng, 2)
      ) * 111; // Rough conversion to km

      // Only include if within radius
      if (distance <= radiusKm) {
        cabs.push({
          id: `cab_${i + 1}`,
          provider: providers[Math.floor(Math.random() * providers.length)],
          type: types[Math.floor(Math.random() * types.length)],
          lat: randomLat,
          lng: randomLng,
          distance: Math.round(distance * 100) / 100,
          eta: Math.round((distance * 2 + Math.random() * 5) * 10) / 10,
          status: Math.random() > 0.3 ? 'available' : 'busy',
          driverName: `Driver ${i + 1}`,
          rating: Math.round((4 + Math.random()) * 10) / 10
        });
      }
    }

    return cabs;
  };

  // Generate map URL for iframe with route tracking
  const generateMapUrl = (center: { lat: number; lng: number }, cabs: CabLocation[], destination?: { lat: number; lng: number } | null) => {
    // Using Google Maps Embed API format (replace with your actual API key)
    const markers = [];
    
    // Add pickup location marker
    markers.push(`markers=color:blue%7Clabel:P%7C${center.lat},${center.lng}`);
    
    // Add destination marker if available
    if (destination) {
      markers.push(`markers=color:red%7Clabel:D%7C${destination.lat},${destination.lng}`);
    }
    
    // Add cab markers
    cabs.forEach(cab => {
      markers.push(`markers=color:${cab.status === 'available' ? 'green' : 'orange'}%7Clabel:C%7C${cab.lat},${cab.lng}`);
    });
    
    // Add route path if destination is available
    let routeParam = '';
    if (destination) {
      routeParam = `&path=color:0x0000ff|weight:3|${center.lat},${center.lng}|${destination.lat},${destination.lng}`;
    }
    
    // This is a mock URL - in production, you'd use a real map service with proper API key
    return `https://maps.google.com/maps?q=${center.lat},${center.lng}&t=m&z=14&output=embed&${markers.join('&')}${routeParam}`;
  };

  const fetchAvailableCabs = async () => {
    if (!pickupLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const cabs = generateMockCabs(pickupLocation, radius);
      
      // When AI agent mode is off, keep the same cabs to avoid flickering
      if (!aiAgentMode && availableCabs.length > 0) {
        // Only update positions slightly to simulate movement, don't regenerate
        const updatedCabs = availableCabs.map(cab => ({
          ...cab,
          lat: cab.lat + (Math.random() - 0.5) * 0.001, // Small position change
          lng: cab.lng + (Math.random() - 0.5) * 0.001,
          eta: Math.max(1, cab.eta + (Math.random() - 0.5) * 0.5) // Small ETA change
        }));
        setAvailableCabs(updatedCabs);
        setMapUrl(generateMapUrl(pickupLocation, updatedCabs, destination));
      } else {
        // Generate new cabs when AI agent mode is on or first load
        setAvailableCabs(cabs);
        setMapUrl(generateMapUrl(pickupLocation, cabs, destination));
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch available cabs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch cabs when pickup location changes
  useEffect(() => {
    if (pickupLocation) {
      fetchAvailableCabs();
    }
  }, [pickupLocation, radius, fetchAvailableCabs]);

  // Set up auto-refresh - only when AI agent mode is on
  useEffect(() => {
    if (pickupLocation && aiAgentMode) {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Set up new interval (refresh every 30 seconds only when AI agent mode is on)
      intervalRef.current = setInterval(() => {
        fetchAvailableCabs();
      }, 30000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Clear interval when AI agent mode is off
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [pickupLocation, radius, fetchAvailableCabs, aiAgentMode]);

  const handleCabClick = (cab: CabLocation) => {
    setSelectedCab(cab.id);
    if (onCabSelect) {
      onCabSelect(cab);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-100';
      case 'busy':
        return 'text-red-600 bg-red-100';
      case 'enroute':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!pickupLocation) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Pickup Location</h3>
        <p className="text-gray-600">Please select a pickup location to see available cabs nearby.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Map Section */}
      <div className="relative">
        <div className="h-64 bg-gray-100 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          ) : (
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Real-time Cab Locations"
            />
          )}
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 space-y-2">
            <button
              onClick={fetchAvailableCabs}
              disabled={isLoading}
              className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-md shadow-md transition-colors disabled:opacity-50"
              title="Refresh cab locations"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Radius Indicator */}
          <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-3 py-1 rounded-md text-sm">
            <span className="text-gray-700">Showing cabs within {radius}km radius</span>
          </div>
        </div>
      </div>

      {/* Cab List Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Available Cabs ({availableCabs.length})
          </h3>
          {lastUpdated && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {isLoading && availableCabs.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Finding nearby cabs...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchAvailableCabs}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : availableCabs.length === 0 ? (
          <div className="text-center py-8">
            <Car className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No cabs available in this area</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {availableCabs.map((cab) => (
              <div
                key={cab.id}
                onClick={() => handleCabClick(cab)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedCab === cab.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Car className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{cab.provider}</span>
                        <span className="text-sm text-gray-600">{cab.type}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(cab.status)}`}>
                          {cab.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{cab.distance} km away</span>
                        <span>ETA: {cab.eta} min</span>
                        {cab.rating && <span>⭐ {cab.rating}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {cab.driverName}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeCabMap;