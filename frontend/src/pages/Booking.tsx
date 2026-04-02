import React, { useState, useEffect } from 'react';
import { useBooking } from '../contexts/BookingContext';
import { useAuth } from '../contexts/AuthContext';
import LocationSuggestions from '../components/booking/LocationSuggestions';
import RealTimeCabMap from '../components/booking/RealTimeCabMap';
import { MapPin, Users, Star, Phone, Car, Search, Filter, ChevronRight, User } from 'lucide-react';

interface CabOption {
  id: string;
  provider: string;
  type: string;
  price: number;
  estimatedTime: number;
  rating: number;
  distance: number;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  features: string[];
  aiScore: number;
  aiReason: string;
}

const Booking: React.FC = () => {
  const { searchCabs, selectCab, createBooking } = useBooking();
  const { user } = useAuth();
  const [searchData, setSearchData] = useState({
    pickupLocation: '',
    dropLocation: '',
    date: '',
    time: '',
    passengers: 1,
    cabType: 'any',
  });
  const [searchResults, setSearchResults] = useState<CabOption[]>([]);
  const [selectedCab, setSelectedCab] = useState<CabOption | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [pickupCoordinates, setPickupCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [filters, setFilters] = useState({
    maxPrice: 1000,
    minRating: 4.0,
    maxWaitTime: 30,
  });

  useEffect(() => {
    // Parse URL parameters if they exist
    const urlParams = new URLSearchParams(window.location.search);
    const pickup = urlParams.get('pickup');
    const drop = urlParams.get('drop');
    const date = urlParams.get('date');
    const time = urlParams.get('time');

    if (pickup) {
      setSearchData(prev => ({ ...prev, pickupLocation: pickup }));
      // Set default coordinates for Mumbai if pickup location is provided
      setPickupCoordinates({ lat: 19.0760, lng: 72.8777 });
    }
    if (drop) setSearchData(prev => ({ ...prev, dropLocation: drop }));
    if (date) setSearchData(prev => ({ ...prev, date }));
    if (time) setSearchData(prev => ({ ...prev, time }));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchPerformed(true);

    try {
      // Mock AI-powered search results
      const mockResults: CabOption[] = [
        {
          id: '1',
          provider: 'Ola',
          type: 'Mini',
          price: 180,
          estimatedTime: 8,
          rating: 4.3,
          distance: 2.1,
          driverName: 'Ramesh Kumar',
          driverPhone: '+91 98765 43210',
          vehicleNumber: 'MH 01 AB 1234',
          features: ['AC', 'Music', 'GPS'],
          aiScore: 92,
          aiReason: 'Best balance of price and ETA, highly rated driver'
        },
        {
          id: '2',
          provider: 'Uber',
          type: 'Go',
          price: 165,
          estimatedTime: 12,
          rating: 4.1,
          distance: 2.8,
          driverName: 'Suresh Patel',
          driverPhone: '+91 98765 43211',
          vehicleNumber: 'MH 02 CD 5678',
          features: ['AC', 'Phone Charger'],
          aiScore: 88,
          aiReason: 'Lowest price option, good for budget travelers'
        },
        {
          id: '3',
          provider: 'Meru',
          type: 'Sedan',
          price: 220,
          estimatedTime: 5,
          rating: 4.6,
          distance: 1.5,
          driverName: 'Amit Sharma',
          driverPhone: '+91 98765 43212',
          vehicleNumber: 'MH 03 EF 9012',
          features: ['AC', 'Music', 'GPS', 'Phone Charger', 'Premium Service'],
          aiScore: 95,
          aiReason: 'Fastest arrival, premium service, highly rated'
        },
        {
          id: '4',
          provider: 'Mega',
          type: 'Micro',
          price: 150,
          estimatedTime: 15,
          rating: 3.9,
          distance: 3.2,
          driverName: 'Vijay Singh',
          driverPhone: '+91 98765 43213',
          vehicleNumber: 'MH 04 GH 3456',
          features: ['AC'],
          aiScore: 75,
          aiReason: 'Most affordable option, longer wait time'
        },
      ];

      // Filter results based on user preferences and filters
      const filteredResults = mockResults.filter(cab => {
        if (filters.maxPrice && cab.price > filters.maxPrice) return false;
        if (filters.minRating && cab.rating < filters.minRating) return false;
        if (filters.maxWaitTime && cab.estimatedTime > filters.maxWaitTime) return false;
        if (searchData.cabType !== 'any' && !cab.type.toLowerCase().includes(searchData.cabType.toLowerCase())) return false;
        return true;
      });

      // Sort by price (ascending) for better user experience
      filteredResults.sort((a, b) => a.price - b.price);
      
      setSearchResults(filteredResults);
      
      // Store search in context (fix: pass proper arguments to searchCabs)
      const pickupLocation = {
        address: searchData.pickupLocation,
        coordinates: { lat: 19.0760, lng: 72.8777 } // Default coordinates for Mumbai
      };
      const destination = {
        address: searchData.dropLocation,
        coordinates: { lat: 19.0760, lng: 72.8777 } // Default coordinates for Mumbai
      };
      
      await searchCabs(pickupLocation, destination, searchData.cabType);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: string, coordinates?: {lat: number, lng: number}) => {
    setSearchData(prev => ({ ...prev, pickupLocation: location }));
    setPickupCoordinates(coordinates || null);
    setShowLocationSuggestions(false);
  };

  const handleClearSearchData = () => {
    setSearchData({
      pickupLocation: '',
      dropLocation: '',
      date: '',
      time: '',
      passengers: 1,
      cabType: 'any',
    });
    setPickupCoordinates(null);
    setSearchResults([]);
    setSearchPerformed(false);
  };

  const handleCabSelect = (cab: CabOption) => {
    setSelectedCab(cab);
    
    // Convert CabOption to CabProvider format
    const cabProvider = {
      name: cab.provider,
      providerId: cab.id,
      vehicleType: cab.type,
      fare: {
        baseFare: cab.price * 0.3,
        distanceFare: cab.price * 0.5,
        timeFare: cab.price * 0.2,
        totalFare: cab.price
      },
      eta: cab.estimatedTime,
      rating: cab.rating,
      safety: {
        driverVerification: true,
        vehicleCondition: cab.rating,
        safetyFeatures: cab.features
      }
    };
    
    selectCab(cabProvider);
  };

  const handleBookNow = async () => {
    if (!selectedCab || !user) return;

    try {
      // Create Location objects for pickup and destination
      const pickupLocation = {
        address: searchData.pickupLocation,
        coordinates: { lat: 19.0760, lng: 72.8777 } // Default coordinates for Mumbai
      };
      const destination = {
        address: searchData.dropLocation,
        coordinates: { lat: 19.0760, lng: 72.8777 } // Default coordinates for Mumbai
      };

      // Create CabProvider object
      const cabProvider = {
        name: selectedCab.provider,
        providerId: selectedCab.id,
        vehicleType: selectedCab.type,
        fare: {
          baseFare: selectedCab.price * 0.3,
          distanceFare: selectedCab.price * 0.5,
          timeFare: selectedCab.price * 0.2,
          totalFare: selectedCab.price
        },
        eta: selectedCab.estimatedTime,
        rating: selectedCab.rating,
        safety: {
          driverVerification: true,
          vehicleCondition: selectedCab.rating,
          safetyFeatures: selectedCab.features
        }
      };

      const bookingData = {
        pickupLocation,
        destination,
        estimatedDistance: selectedCab.distance,
        estimatedDuration: selectedCab.estimatedTime,
        provider: cabProvider,
        vehicleType: selectedCab.type,
        fare: cabProvider.fare,
        paymentMethod: 'wallet' as const // Default payment method
      };

      await createBooking(bookingData);
      alert('Booking confirmed! You will receive driver details shortly.');
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Booking failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book Your Ride</h1>
          <p className="text-gray-600 mt-2">Find the perfect cab with our AI-powered search</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchData.pickupLocation}
                    onChange={(e) => setSearchData({ ...searchData, pickupLocation: e.target.value })}
                    onFocus={() => setShowLocationSuggestions(true)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter pickup location"
                    required
                  />
                </div>
                {showLocationSuggestions && (
                  <LocationSuggestions
                    currentLocation={searchData.pickupLocation}
                    onLocationSelect={handleLocationSelect}
                    onClearData={handleClearSearchData}
                    onClose={() => setShowLocationSuggestions(false)}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drop Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchData.dropLocation}
                    onChange={(e) => setSearchData({ ...searchData, dropLocation: e.target.value })}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter drop location"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={searchData.date}
                  onChange={(e) => setSearchData({ ...searchData, date: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={searchData.time}
                  onChange={(e) => setSearchData({ ...searchData, time: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passengers
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <select
                    value={searchData.passengers}
                    onChange={(e) => setSearchData({ ...searchData, passengers: parseInt(e.target.value) })}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Passenger' : 'Passengers'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cab Type
                </label>
                <select
                  value={searchData.cabType}
                  onChange={(e) => setSearchData({ ...searchData, cabType: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="any">Any</option>
                  <option value="mini">Mini</option>
                  <option value="micro">Micro</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
              >
                <Filter className="h-5 w-5" />
                <span>Advanced Filters</span>
              </button>

              <button
                type="submit"
                disabled={isSearching}
                className="bg-primary-600 text-white px-8 py-3 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Search className="h-5 w-5" />
                <span>{isSearching ? 'Searching...' : 'Search Cabs'}</span>
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Filter Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Price (₹)
                    </label>
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Rating
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={filters.minRating}
                      onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Wait Time (min)
                    </label>
                    <input
                      type="number"
                      value={filters.maxWaitTime}
                      onChange={(e) => setFilters({ ...filters, maxWaitTime: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Real-time Cab Map */}
        {pickupCoordinates && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Available Cabs Near You
            </h2>
            <RealTimeCabMap
              pickupLocation={pickupCoordinates}
              radius={5}
              destination={searchData.dropLocation ? {
                lat: pickupCoordinates.lat + 0.01, // Mock destination coordinates
                lng: pickupCoordinates.lng + 0.01
              } : null}
              aiAgentMode={false} // AI agent mode is off for real-time map
              onCabSelect={(cab) => {
                console.log('Selected cab:', cab);
                // You can integrate this with your existing cab selection logic
              }}
            />
          </div>
        )}

        {/* Search Results */}
        {searchPerformed && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Available Cabs ({searchResults.length})
              </h2>
            </div>

            {isSearching ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching for available cabs...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No cabs available for your search criteria</p>
                <button
                  onClick={() => setShowFilters(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Adjust Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {searchResults.map((cab) => (
                  <div
                    key={cab.id}
                    className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all ${
                      selectedCab?.id === cab.id
                        ? 'border-primary-500 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >


                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {cab.provider} {cab.type}
                        </h3>
                        <p className="text-sm text-gray-600">{cab.vehicleNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">₹{cab.price}</p>
                        <p className="text-sm text-gray-600">{cab.estimatedTime} min away</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="h-4 w-4 mr-2 text-yellow-500" />
                        <span>{cab.rating} rating</span>
                        <span className="mx-2">•</span>
                        <span>{cab.distance} km away</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span>{cab.driverName}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{cab.driverPhone}</span>
                      </div>

                      {cab.features.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {cab.features.map((feature, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}


                    </div>

                    <button
                      onClick={() => handleCabSelect(cab)}
                      className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                        selectedCab?.id === cab.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {selectedCab?.id === cab.id ? 'Selected' : 'Select This Cab'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Booking Summary */}
            {selectedCab && (
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-primary-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Trip Details</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>From:</strong> {searchData.pickupLocation}</p>
                      <p><strong>To:</strong> {searchData.dropLocation}</p>
                      <p><strong>Date:</strong> {searchData.date}</p>
                      <p><strong>Time:</strong> {searchData.time}</p>
                      <p><strong>Passengers:</strong> {searchData.passengers}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Selected Cab</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>Provider:</strong> {selectedCab.provider} {selectedCab.type}</p>
                      <p><strong>Driver:</strong> {selectedCab.driverName}</p>
                      <p><strong>Vehicle:</strong> {selectedCab.vehicleNumber}</p>
                      <p><strong>Estimated Time:</strong> {selectedCab.estimatedTime} min</p>
                      <p><strong>Fare:</strong> ₹{selectedCab.price}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    onClick={() => setSelectedCab(null)}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Change Selection
                  </button>
                  <button
                    onClick={handleBookNow}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center space-x-2"
                  >
                    <span>Confirm Booking</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;