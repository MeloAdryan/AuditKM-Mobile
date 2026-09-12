import React from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';

import AuditScreen from '../screens/AuditScreen';
import DashboardScreen from '../screens/DashboardScreen';
import EmployeesScreen from '../screens/EmployeesScreen';
import LoginScreen from '../screens/LoginScreen';
import StartTripScreen from '../screens/StartTripScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';
import TripsScreen from '../screens/TripsScreen';
import VehiclesScreen from '../screens/VehiclesScreen';


export type RootStackParamList = {
  Login: undefined;

  Dashboard: undefined;

  Trips: undefined;

  Vehicles: undefined;

  Employees: undefined;

  StartTrip: undefined;

  Audit: {
    tripId: number;
  };

  TripDetails: {
    tripId: number;
  };
};


const Stack =
  createNativeStackNavigator<
    RootStackParamList
  >();


export default function AppNavigator() {
  const {
    loading,
    isAuthenticated,
  } = useAuth();


  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }


  return (
    <NavigationContainer>

      <Stack.Navigator>

        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />

        ) : (
          <>

            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                title: 'AuditKM',
                headerBackVisible: false,
              }}
            />


            <Stack.Screen
              name="Trips"
              component={TripsScreen}
              options={{
                title: 'Viagens',
              }}
            />


            <Stack.Screen
              name="TripDetails"
              component={TripDetailsScreen}
              options={{
                title: 'Detalhes da viagem',
              }}
            />


            <Stack.Screen
              name="StartTrip"
              component={StartTripScreen}
              options={{
                title: 'Iniciar viagem',
              }}
            />


            <Stack.Screen
              name="Vehicles"
              component={VehiclesScreen}
              options={{
                title: 'Veículos',
              }}
            />


            <Stack.Screen
              name="Employees"
              component={EmployeesScreen}
              options={{
                title: 'Funcionários',
              }}
            />


            <Stack.Screen
              name="Audit"
              component={AuditScreen}
              options={{
                title: 'Auditoria',
              }}
            />

          </>
        )}

      </Stack.Navigator>

    </NavigationContainer>
  );
}


const styles =
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F4F6F8',
    },
  });