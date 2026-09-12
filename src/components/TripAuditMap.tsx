import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MapView, {
  Marker,
  Polyline,
} from 'react-native-maps';

import type {
  MapCoordinate,
  StandardRoutePoint,
  TripLocationMapPoint,
} from '../types/tripMap';


interface Props {
  standardPoints: StandardRoutePoint[];
  actualPoints: TripLocationMapPoint[];
}


function convertStandardPoints(
  points: StandardRoutePoint[],
): MapCoordinate[] {
  return [...points]
    .sort(
      (a, b) =>
        a.sequence - b.sequence,
    )
    .map((point) => ({
      latitude:
        Number(point.latitude),

      longitude:
        Number(point.longitude),
    }))
    .filter(
      (point) =>
        Number.isFinite(
          point.latitude,
        ) &&
        Number.isFinite(
          point.longitude,
        ),
    );
}


function convertActualPoints(
  points: TripLocationMapPoint[],
): MapCoordinate[] {
  return [...points]
    .sort(
      (a, b) =>
        new Date(
          a.recorded_at,
        ).getTime() -
        new Date(
          b.recorded_at,
        ).getTime(),
    )
    .map((point) => ({
      latitude:
        Number(point.latitude),

      longitude:
        Number(point.longitude),
    }))
    .filter(
      (point) =>
        Number.isFinite(
          point.latitude,
        ) &&
        Number.isFinite(
          point.longitude,
        ),
    );
}


export default function TripAuditMap({
  standardPoints,
  actualPoints,
}: Props) {
  const mapRef =
    useRef<MapView | null>(
      null,
    );

  const [
    mapReady,
    setMapReady,
  ] = useState(false);


  const standardCoordinates =
    useMemo(
      () =>
        convertStandardPoints(
          standardPoints,
        ),
      [
        standardPoints,
      ],
    );


  const actualCoordinates =
    useMemo(
      () =>
        convertActualPoints(
          actualPoints,
        ),
      [
        actualPoints,
      ],
    );


  const allCoordinates =
    useMemo(
      () => [
        ...standardCoordinates,
        ...actualCoordinates,
      ],
      [
        standardCoordinates,
        actualCoordinates,
      ],
    );


  useEffect(() => {
    if (
      !mapReady ||
      !mapRef.current ||
      allCoordinates.length === 0
    ) {
      return;
    }

    const timer =
      setTimeout(() => {
        mapRef.current
          ?.fitToCoordinates(
            allCoordinates,
            {
              edgePadding: {
                top: 70,
                right: 50,
                bottom: 70,
                left: 50,
              },

              animated: true,
            },
          );
      }, 250);

    return () =>
      clearTimeout(timer);

  }, [
    mapReady,
    allCoordinates,
  ]);


  if (
    standardCoordinates.length === 0 &&
    actualCoordinates.length === 0
  ) {
    return (
      <View
        style={
          styles.emptyContainer
        }
      >
        <Text
          style={
            styles.emptyTitle
          }
        >
          Sem dados para o mapa
        </Text>

        <Text
          style={
            styles.emptyText
          }
        >
          Esta viagem ainda não possui
          pontos suficientes da rota padrão
          ou do trajeto realizado.
        </Text>
      </View>
    );
  }


  const firstCoordinate =
    standardCoordinates[0] ??
    actualCoordinates[0];


  const standardStart =
    standardCoordinates[0];

  const standardEnd =
    standardCoordinates[
      standardCoordinates.length - 1
    ];

  const actualStart =
    actualCoordinates[0];

  const actualEnd =
    actualCoordinates[
      actualCoordinates.length - 1
    ];


  return (
    <View
      style={styles.container}
    >

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude:
            firstCoordinate.latitude,

          longitude:
            firstCoordinate.longitude,

          latitudeDelta:
            0.02,

          longitudeDelta:
            0.02,
        }}
        onMapReady={() =>
          setMapReady(true)
        }
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass
        showsScale
      >

        {standardCoordinates.length >=
          2 && (
          <Polyline
            coordinates={
              standardCoordinates
            }
            strokeWidth={5}
            strokeColor="#1565C0"
          />
        )}


        {actualCoordinates.length >=
          2 && (
          <Polyline
            coordinates={
              actualCoordinates
            }
            strokeWidth={5}
            strokeColor="#E53935"
          />
        )}


        {standardStart && (
          <Marker
            coordinate={
              standardStart
            }
            title="Início da rota padrão"
            pinColor="#1565C0"
          />
        )}


        {standardEnd && (
          <Marker
            coordinate={
              standardEnd
            }
            title="Fim da rota padrão"
            pinColor="#1565C0"
          />
        )}


        {actualStart && (
          <Marker
            coordinate={
              actualStart
            }
            title="Início do trajeto realizado"
            pinColor="#E53935"
          />
        )}


        {actualEnd && (
          <Marker
            coordinate={
              actualEnd
            }
            title="Fim do trajeto realizado"
            pinColor="#E53935"
          />
        )}

      </MapView>


      <View
        style={styles.legend}
      >

        <View
          style={
            styles.legendItem
          }
        >
          <View
            style={[
              styles.legendLine,
              styles.standardLine,
            ]}
          />

          <Text
            style={
              styles.legendText
            }
          >
            Rota padrão
          </Text>
        </View>


        <View
          style={
            styles.legendItem
          }
        >
          <View
            style={[
              styles.legendLine,
              styles.actualLine,
            ]}
          />

          <Text
            style={
              styles.legendText
            }
          >
            Trajeto realizado
          </Text>
        </View>

      </View>


      <View
        style={styles.metrics}
      >

        <Text
          style={styles.metricText}
        >
          Pontos da rota padrão:{' '}
          {standardCoordinates.length}
        </Text>


        <Text
          style={styles.metricText}
        >
          Pontos GPS registrados:{' '}
          {actualCoordinates.length}
        </Text>

      </View>

    </View>
  );
}


const styles =
  StyleSheet.create({
    container: {
      overflow: 'hidden',
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
    },

    map: {
      width: '100%',
      height: 360,
    },

    legend: {
      padding: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      borderTopWidth: 1,
      borderTopColor: '#ECEFF1',
    },

    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    legendLine: {
      width: 28,
      height: 4,
      borderRadius: 2,
      marginRight: 8,
    },

    standardLine: {
      backgroundColor: '#1565C0',
    },

    actualLine: {
      backgroundColor: '#E53935',
    },

    legendText: {
      color: '#455A64',
      fontWeight: '600',
    },

    metrics: {
      paddingHorizontal: 14,
      paddingBottom: 14,
    },

    metricText: {
      marginTop: 4,
      color: '#78909C',
      fontSize: 12,
    },

    emptyContainer: {
      minHeight: 220,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
    },

    emptyTitle: {
      color: '#263238',
      fontSize: 17,
      fontWeight: 'bold',
    },

    emptyText: {
      marginTop: 7,
      maxWidth: 280,
      textAlign: 'center',
      color: '#78909C',
      lineHeight: 20,
    },
  });