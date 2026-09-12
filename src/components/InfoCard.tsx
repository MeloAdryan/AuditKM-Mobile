import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';


interface InfoCardProps {
  label: string;
  value: string | number;
  helperText?: string;
}


export default function InfoCard({
  label,
  value,
  helperText,
}: InfoCardProps) {
  return (
    <View style={styles.card}>

      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>

      {helperText && (
        <Text style={styles.helperText}>
          {helperText}
        </Text>
      )}

    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },

  value: {
    marginTop: 5,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#263238',
  },

  helperText: {
    marginTop: 5,
    color: '#607D8B',
    fontSize: 12,
  },
});