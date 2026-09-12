import React from 'react';

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface DashboardCardProps {
  title: string;
  description: string;
  value?: string | number;
  onPress?: () => void;
}

export default function DashboardCard({
  title,
  description,
  value,
  onPress,
}: DashboardCardProps) {
  const content = (
    <View style={styles.card}>
      <Text style={styles.title}>
        {title}
      </Text>

      {value !== undefined && (
        <Text style={styles.value}>
          {value}
        </Text>
      )}

      <Text style={styles.description}>
        {description}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },

  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#263238',
  },

  value: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginTop: 8,
  },

  description: {
    marginTop: 6,
    color: '#607D8B',
    lineHeight: 20,
  },
});