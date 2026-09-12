import * as Location from 'expo-location';

export interface CurrentLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  recorded_at: string;
}

export async function requestLocationPermission() {
  const { status } =
    await Location.requestForegroundPermissionsAsync();

  return status === 'granted';
}

export async function getCurrentLocation(): Promise<CurrentLocation> {
  const location =
    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    altitude: location.coords.altitude,
    heading: location.coords.heading,
    speed: location.coords.speed,
    recorded_at: new Date(
      location.timestamp,
    ).toISOString(),
  };
}