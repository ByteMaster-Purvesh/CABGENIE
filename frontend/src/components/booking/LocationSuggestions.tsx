import React, { useState, useEffect } from 'react';
import { MapPin, Target, Trash2, RefreshCw } from 'lucide-react';

interface LocationSuggestionsProps {
  onLocationSelect: (location: string, coordinates?: { lat: number; lng: number }) => void;
  currentLocation: string;
  onClearData: () => void;
  onClose: () => void;
}

interface SuggestedLocation {
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  type: 'current' | 'recent' | 'popular';
}

const LocationSuggestions: React.FC<LocationSuggestionsProps> = ({
  onLocationSelect,
  currentLocation,
  onClearData,
  onClose
}) => {
  const [hasLocationAccess, setHasLocationAccess] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestedLocations, setSuggestedLocations] = useState<SuggestedLocation[]>([]);

  // Check location permission on component mount
  useEffect(() => {
    checkLocationPermission();
    loadSuggestedLocations();
  }, [hasLocationAccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkLocationPermission = async () => {
    if ('permissions' in navigator) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        setHasLocationAccess(permissionStatus.state === 'granted');
        
        permissionStatus.addEventListener('change', () => {
          setHasLocationAccess(permissionStatus.state === 'granted');
        });
      } catch (error) {
        console.log('Permissions API not supported');
      }
    } else {
      // Fallback: check if we have location data in localStorage
      const savedLocation = localStorage.getItem('userLocation');
      setHasLocationAccess(!!savedLocation);
    }
  };

  const loadSuggestedLocations = () => {
    const locations: SuggestedLocation[] = [];
    
    // Add current location if available
    if (hasLocationAccess) {
      locations.push({
        name: 'Current Location',
        address: 'Your current position',
        type: 'current'
      });
    }

    // Add recent locations from localStorage
    const recentLocations = JSON.parse(localStorage.getItem('recentLocations') || '[]');
    recentLocations.forEach((loc: any) => {
      locations.push({
        name: loc.name || loc.address,
        address: loc.address,
        coordinates: loc.coordinates,
        type: 'recent'
      });
    });

    // Add popular locations
    const popularLocations = [
      { name: 'Mumbai Airport', address: 'Chhatrapati Shivaji Maharaj International Airport, Mumbai' },
      { name: 'CST Station', address: 'Chhatrapati Shivaji Terminus, Mumbai' },
      { name: 'Gateway of India', address: 'Gateway of India, Apollo Bandar, Mumbai' },
      { name: 'Bandra Station', address: 'Bandra Railway Station, Mumbai' }
    ];

    popularLocations.forEach(loc => {
      if (!locations.some(existing => existing.address === loc.address)) {
        locations.push({
          name: loc.name,
          address: loc.address,
          type: 'popular'
        });
      }
    });

    setSuggestedLocations(locations);
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Store location in localStorage
      localStorage.setItem('userLocation', JSON.stringify({
        latitude,
        longitude,
        timestamp: Date.now()
      }));

      // Add to recent locations
      addToRecentLocations('Current Location', 'Your current position', { lat: latitude, lng: longitude });

      // Use reverse geocoding to get address (simplified)
      const locationName = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      onLocationSelect(locationName, { lat: latitude, lng: longitude });
      onClose();
      
      setHasLocationAccess(true);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get your current location. Please check your browser permissions.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const addToRecentLocations = (name: string, address: string, coordinates?: { lat: number; lng: number }) => {
    const recent = JSON.parse(localStorage.getItem('recentLocations') || '[]');
    const newLocation = { name, address, coordinates, timestamp: Date.now() };
    
    // Remove duplicates and limit to 5 recent locations
    const filtered = recent.filter((loc: any) => loc.address !== address);
    filtered.unshift(newLocation);
    if (filtered.length > 5) filtered.pop();
    
    localStorage.setItem('recentLocations', JSON.stringify(filtered));
    loadSuggestedLocations();
  };

  const handleLocationSelect = (location: SuggestedLocation) => {
    onLocationSelect(location.address, location.coordinates);
    onClose();
    
    // Add to recent locations
    addToRecentLocations(location.name, location.address, location.coordinates);
  };

  const handleClearInput = () => {
    onLocationSelect('', undefined);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'current':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'recent':
        return <RefreshCw className="h-4 w-4 text-green-600" />;
      case 'popular':
        return <MapPin className="h-4 w-4 text-purple-600" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'current':
        return 'Current Location';
      case 'recent':
        return 'Recent';
      case 'popular':
        return 'Popular';
      default:
        return 'Location';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      {/* Location Access Section */}
      {hasLocationAccess && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Location Access</h4>
          <div className="space-y-2">
            <button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGettingLocation ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Getting location...</span>
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  <span>Use Current Location</span>
                </>
              )}
            </button>
            
            {locationError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {locationError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested Locations */}
      {suggestedLocations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Locations</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {suggestedLocations.map((location, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(location)}
                className="w-full flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors text-left"
              >
                <div className="flex-shrink-0 mt-1">
                  {getIcon(location.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {location.name}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {getTypeLabel(location.type)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {location.address}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Data Management Section */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Data Management</h4>
        <div className="space-y-2">
          {currentLocation && (
            <button
              onClick={handleClearInput}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Current Input</span>
            </button>
          )}
          
          <button
            onClick={onClearData}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All Search Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSuggestions;