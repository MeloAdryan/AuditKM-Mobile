import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';

import api from '../services/api';

import {
  formatDateTime,
  formatKm,
  getTripStatusLabel,
} from '../utils/formatters';

import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Trip } from '../types/trip';


type Props = NativeStackScreenProps<
  RootStackParamList,
  'Trips'
>;


export default function TripsScreen({
  navigation,
}: Props) {
  const [trips, setTrips] =
    useState<Trip[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  const loadTrips =
    useCallback(async () => {
      try {
        setError(null);

        const response =
          await api.get<Trip[]>(
            '/trips/',
          );

        setTrips(response.data);

      } catch (err) {
        console.error(
          'Erro ao carregar viagens:',
          err,
        );

        setError(
          'Não foi possível carregar as viagens.',
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);


  useEffect(() => {
    loadTrips();
  }, [loadTrips]);


  function handleRefresh() {
    setRefreshing(true);
    loadTrips();
  }


  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Carregando viagens...
        </Text>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        data={trips}
        keyExtractor={(item) =>
          item.id.toString()
        }
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListHeaderComponent={
          <>
            <ScreenHeader
              title="Viagens"
              subtitle="Acompanhe os deslocamentos registrados."
              actionLabel="Nova viagem"
              onActionPress={() =>
                navigation.navigate(
                  'StartTrip',
                )
              }
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nenhuma viagem"
            description="Ainda não existem viagens disponíveis para este usuário."
            buttonTitle="Iniciar viagem"
            onButtonPress={() =>
              navigation.navigate(
                'StartTrip',
              )
            }
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tripCard}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate(
                'TripDetails',
                {
                  tripId: item.id,
                },
              )
            }
          >

            <View style={styles.tripHeader}>

              <View>
                <Text style={styles.vehicle}>
                  {item.vehicle_plate}
                </Text>

                <Text style={styles.driver}>
                  {item.driver_username}
                </Text>
              </View>

              <View style={styles.statusBox}>
                <Text style={styles.status}>
                  {getTripStatusLabel(
                    item.status,
                  )}
                </Text>
              </View>

            </View>


            <View style={styles.routeBox}>

              <View style={styles.routePoint}>
                <View style={styles.dot} />

                <View>
                  <Text style={styles.routeLabel}>
                    Origem
                  </Text>

                  <Text style={styles.routeValue}>
                    {item.origin}
                  </Text>
                </View>
              </View>


              <View style={styles.routeLine} />


              <View style={styles.routePoint}>
                <View style={styles.dot} />

                <View>
                  <Text style={styles.routeLabel}>
                    Destino
                  </Text>

                  <Text style={styles.routeValue}>
                    {item.destination}
                  </Text>
                </View>
              </View>

            </View>


            <View style={styles.tripFooter}>

              <Text style={styles.smallText}>
                {formatDateTime(
                  item.started_at,
                )}
              </Text>

              <Text style={styles.kmText}>
                {item.traveled_km !== null
                  ? formatKm(
                      item.traveled_km,
                    )
                  : '—'}
              </Text>

            </View>

          </TouchableOpacity>
        )}
      />

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F8',
  },

  loadingText: {
    marginTop: 10,
    color: '#607D8B',
  },

  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 9,
    marginBottom: 15,
  },

  errorText: {
    color: '#C62828',
  },

  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 17,
    marginBottom: 12,
  },

  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  vehicle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
  },

  driver: {
    marginTop: 3,
    color: '#78909C',
  },

  statusBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },

  status: {
    color: '#1565C0',
    fontWeight: '600',
    fontSize: 12,
  },

  routeBox: {
    marginTop: 18,
  },

  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D47A1',
    marginRight: 12,
  },

  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: '#BBDEFB',
    marginLeft: 4,
  },

  routeLabel: {
    color: '#90A4AE',
    fontSize: 11,
  },

  routeValue: {
    color: '#37474F',
    fontWeight: '600',
  },

  tripFooter: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  smallText: {
    color: '#90A4AE',
    fontSize: 12,
  },

  kmText: {
    color: '#0D47A1',
    fontWeight: 'bold',
  },
});