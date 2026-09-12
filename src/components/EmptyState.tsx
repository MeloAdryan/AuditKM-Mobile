import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from './AppButton';


interface EmptyStateProps {
  title: string;
  description: string;
  buttonTitle?: string;
  onButtonPress?: () => void;
}


export default function EmptyState({
  title,
  description,
  buttonTitle,
  onButtonPress,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>

      <View style={styles.iconPlaceholder}>
        <Text style={styles.iconText}>
          AuditKM
        </Text>
      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.description}>
        {description}
      </Text>

      {buttonTitle && onButtonPress && (
        <View style={styles.buttonContainer}>
          <AppButton
            title={buttonTitle}
            onPress={onButtonPress}
          />
        </View>
      )}

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },

  iconPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    marginBottom: 18,
  },

  iconText: {
    color: '#0D47A1',
    fontWeight: 'bold',
    fontSize: 12,
  },

  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#263238',
    textAlign: 'center',
  },

  description: {
    marginTop: 7,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
  },

  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
});