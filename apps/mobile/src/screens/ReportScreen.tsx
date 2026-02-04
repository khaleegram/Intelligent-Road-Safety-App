import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createAccident } from '../services/firestore';
import type { AccidentSeverity, AccidentRecord } from '../types';

const severityOptions: AccidentSeverity[] = [
  'Fatal',
  'Critical',
  'Minor',
  'Damage Only',
];

export default function ReportScreen() {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [severity, setSeverity] = useState<AccidentSeverity>('Minor');
  const [roadType, setRoadType] = useState('');
  const [weather, setWeather] = useState('');
  const [vehicleCount, setVehicleCount] = useState('');
  const [casualtyCount, setCasualtyCount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const vehicles = Number(vehicleCount);
    const casualties = Number(casualtyCount);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Invalid location', 'Latitude and longitude must be numbers.');
      return;
    }

    if (!roadType.trim()) {
      Alert.alert('Missing field', 'Road type is required.');
      return;
    }

    if (!weather.trim()) {
      Alert.alert('Missing field', 'Weather condition is required.');
      return;
    }

    if (Number.isNaN(vehicles) || Number.isNaN(casualties)) {
      Alert.alert('Invalid counts', 'Vehicle and casualty counts must be numbers.');
      return;
    }

    const record: AccidentRecord = {
      latitude: lat,
      longitude: lng,
      timestamp: timestamp.trim() || new Date().toISOString(),
      severity,
      road_type: roadType.trim(),
      weather: weather.trim(),
      vehicle_count: vehicles,
      casualty_count: casualties,
      created_at: new Date().toISOString(),
    };

    try {
      setSubmitting(true);
      await createAccident(record);
      Alert.alert('Submitted', 'Accident report saved.');
      setLatitude('');
      setLongitude('');
      setTimestamp('');
      setSeverity('Minor');
      setRoadType('');
      setWeather('');
      setVehicleCount('');
      setCasualtyCount('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit accident report.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accident Report</Text>

      <TextInput
        style={styles.input}
        placeholder="Latitude"
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Longitude"
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Timestamp (ISO, optional)"
        value={timestamp}
        onChangeText={setTimestamp}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Severity</Text>
        <View style={styles.row}>
          {severityOptions.map((option) => (
            <Pressable
              key={option}
              style={[
                styles.chip,
                severity === option && styles.chipSelected,
              ]}
              onPress={() => setSeverity(option)}
            >
              <Text
                style={[
                  styles.chipText,
                  severity === option && styles.chipTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Road type"
        value={roadType}
        onChangeText={setRoadType}
      />
      <TextInput
        style={styles.input}
        placeholder="Weather condition"
        value={weather}
        onChangeText={setWeather}
      />
      <TextInput
        style={styles.input}
        placeholder="Number of vehicles"
        value={vehicleCount}
        onChangeText={setVehicleCount}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Number of casualties"
        value={casualtyCount}
        onChangeText={setCasualtyCount}
        keyboardType="numeric"
      />

      <Pressable style={styles.submit} onPress={submit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit report</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f5f5f5',
  },
  chipSelected: {
    borderColor: '#111',
    backgroundColor: '#111',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  submit: {
    marginTop: 8,
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
});