import React from 'react';

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}


export default function ScreenHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {title}
        </Text>

        {subtitle && (
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>


      {actionLabel && onActionPress && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  textContainer: {
    flex: 1,
    marginRight: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#263238',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: '#78909C',
  },

  actionButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  actionText: {
    color: '#0D47A1',
    fontWeight: '600',
    fontSize: 13,
  },
});