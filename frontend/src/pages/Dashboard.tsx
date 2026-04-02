import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBooking } from '../contexts/BookingContext';
import { Link } from 'react-router-dom';
import { MapPin, Clock, CreditCard, Star, Phone, Car, User, TrendingUp, Calendar } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { bookings } = useBooking();
  const recentBookings = bookings?.slice(-10).reverse() || [];
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'wallet' | 'profile'>('overview');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = [
    { label: 'Total Rides', value: (user as any)?.stats?.totalRides || 0, icon: Car, color: 'text-blue-600' },
    { label: 'Wallet Balance', value: `₹${user?.wallet?.balance || 0}`, icon: CreditCard, color: 'text-green-600' },
    { label: 'Avg Rating', value: (user as any)?.stats?.averageRating || '4.5★', icon: Star, color: 'text-yellow-600' },
    { label: 'Member Since', value: new Date((user as any)?.createdAt || Date.now()).getFullYear(), icon: Calendar, color: 'text-purple-600' },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
        </div>
        <div className="p-6">
          {recentBookings && recentBookings.length > 0 ? (
            <div className="space-y-4">
              {recentBookings.slice(0, 3).map((booking: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Car className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.pickupLocation} → {booking.dropLocation}</p>
                      <p className="text-sm text-gray-500">{new Date(booking.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{booking.fare}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent bookings found</p>
              <Link to="/booking" className="mt-4 inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
                Book Your First Ride
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/booking" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Car className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Book a Ride</h4>
              <p className="text-sm text-gray-600">Find the best cab for your journey</p>
            </div>
          </div>
        </Link>

        <Link to="/wallet" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Wallet</h4>
              <p className="text-sm text-gray-600">Manage your payments and balance</p>
            </div>
          </div>
        </Link>

        <Link to="/profile" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Profile Settings</h4>
              <p className="text-sm text-gray-600">Update your personal information</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">My Bookings</h3>
      </div>
      <div className="p-6">
        {recentBookings && recentBookings.length > 0 ? (
          <div className="space-y-4">
            {recentBookings.map((booking: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{booking.pickupLocation} → {booking.dropLocation}</h4>
                    <p className="text-sm text-gray-500">{new Date(booking.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Cab Type</p>
                    <p className="font-medium">{booking.cabType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fare</p>
                    <p className="font-medium">₹{booking.fare}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Distance</p>
                    <p className="font-medium">{booking.distance} km</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Estimated Time</p>
                    <p className="font-medium">{booking.estimatedTime} min</p>
                  </div>
                </div>

                {booking.status === 'confirmed' && (
                  <div className="mt-4 flex space-x-2">
                    <button className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm hover:bg-primary-700">
                      Track Driver
                    </button>
                    <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50">
                      Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No bookings found</p>
            <Link to="/booking" className="mt-4 inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
              Book Your First Ride
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  const renderWallet = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Wallet Balance</h3>
          <CreditCard className="h-6 w-6 text-green-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-2">₹{user?.wallet?.balance || 0}</div>
        <div className="flex space-x-4">
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            Add Money
          </button>
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
            Transaction History
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {/* Sample transactions - would be populated from API */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <div>
              <p className="font-medium">Ride Payment</p>
              <p className="text-sm text-gray-500">Today, 2:30 PM</p>
            </div>
            <span className="text-red-600 font-medium">-₹250</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <div>
              <p className="font-medium">Wallet Recharge</p>
              <p className="text-sm text-gray-500">Yesterday, 10:15 AM</p>
            </div>
            <span className="text-green-600 font-medium">+₹1000</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            value={user?.profile?.firstName || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            value={user?.profile?.lastName || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            value={user?.profile?.phone || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            readOnly
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <textarea
            value={(user?.profile as any)?.address || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            readOnly
          />
        </div>
      </div>
      <div className="mt-6 flex space-x-4">
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
          Edit Profile
        </button>
        <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
          Change Password
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {user?.profile?.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">Welcome to your CABGENIE dashboard</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'bookings', label: 'My Bookings' },
              { id: 'wallet', label: 'Wallet' },
              { id: 'profile', label: 'Profile' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'bookings' && renderBookings()}
          {activeTab === 'wallet' && renderWallet()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;