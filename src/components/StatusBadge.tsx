import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

type StatusType =
  | 'NORMAL'
  | 'ATTENTION'
  | 'DIVERGENCE'
  | 'JUSTIFIED';

interface StatusBadgeProps {
  status: StatusType;
}

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  const config = {
    NORMAL: {
      label: 'Normal',
      backgroundColor: '#E8F5E9',
      textColor: '#2E7D32',
    },

    ATTENTION: {
      label: 'Atenção',
      backgroundColor: '#FFF8E1',
      textColor: '#F57F17',
    },

    DIVERGENCE: {
      label: 'Divergência',
      backgroundColor: '#FFEBEE',
      textColor: '#C62828',
    },

    JUSTIFIED: {
      label: 'Justificado',
      backgroundColor: '#E3F2FD',
      textColor: '#1565C0',
    },
  };

  const current = config[status];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor:
            current.backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: current.textColor,
          },
        ]}
      >
        {current.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },

  text: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});