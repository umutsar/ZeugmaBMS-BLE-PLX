import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TouchableOpacity, FlatList, Alert, Platform, PermissionsAndroid, Modal, TextInput } from 'react-native';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import Collapsible from 'react-native-collapsible';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BLEService } from './BLEService';
import {
  BleError,
  BleErrorCode,
  BleManager,
  Device,
  State as BluetoothState,
  LogLevel
} from 'react-native-ble-plx';

// Örnek batarya hücre verisi
const batteryCells = Array.from({ length: 10 }, (_, index) => ({
  id: index.toString(),
  voltage: '3.6V',
}));

const BatteryCell = ({ voltage }) => (
  <View style={styles.cell}>
    <Text style={styles.cellText}>{voltage}</Text>
  </View>
);

const temperatures = Array.from({ length: 4 }, (_, index) => ({
  id: index.toString(),
  temp: `${20 + index}°C`, // Basit bir sıcaklık verisi
}));

const Temperature = ({ temp }) => (
  <View style={styles.cell}>
    <Text style={styles.cellText}>{temp}</Text>
  </View>
);

function HomeScreen({ navigation }) {
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const manager = new BleManager();

  let handleBluetoothOffFlag = 1; 


  useEffect(() => {
    if (Platform.OS === 'android') {
      requestBluetoothPermission();
    }
    
    const subscription = manager.onStateChange((state) => {
      if (state === BluetoothState.PoweredOff) {
        if(handleBluetoothOffFlag == 1) {
          handleBluetoothOffFlag = 0;
          handleBluetoothOff();
        }
      } else if (state === BluetoothState.PoweredOn) {
        scanForDevices();
      }
    }, true);

    return () => subscription.remove();
  }, []);

  const requestBluetoothPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Bluetooth Permission',
          message: 'This app requires access to Bluetooth',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Bluetooth permission granted');
      } else {
        console.log('Bluetooth permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleBluetoothOff = () => {
    if (Platform.OS === 'android' ) {
      Alert.alert(
        'Bluetooth Kapalı',
        'Bu uygulama için Bluetooth gereklidir. Lütfen Bluetooth\'u açın.',
        [
          {
            text: 'Aç',
            onPress: () => {
              manager.enable()
              handleBluetoothOffFlag = 1;
            }, // Android için Bluetooth ayarlarına yönlendir
          },
        ],
        { cancelable: false }
      );

    } else if (Platform.OS === 'ios') {
      Alert.alert(
        'Bluetooth Kapalı',
        'Bu uygulama için Bluetooth gereklidir. Lütfen Bluetooth\'u açmak için Ayarlar\'a gidin.',
        [
          {
            text: 'Tamam',
            onPress: () => {}, // iOS'ta doğrudan yönlendirme yapılamaz, sadece bilgi verilebilir
          },
        ],
        { cancelable: false }
      );
    }

  };

  const scanForDevices = () => {
    console.log("Cihazlar Taraniyor")
    setDevices([]); // Reset the device list
    
    manager.startDeviceScan(null, null, (error, scannedDevice) => {
      console.log("Taranan cihaz: ", scannedDevice);
      if (error) {
        console.warn(error);
        return;
      }

      if (scannedDevice) {
        setDevices((prevDevices) => {
          if (!prevDevices.find((device) => device.id === scannedDevice.id)) {
            return [...prevDevices, scannedDevice];
          }
          return prevDevices;
        });
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
    }, 5000);
  };

  const connectToDevice = async (device) => {
    setIsConnecting(true);
    console.log("device: ", device);
    try {
      // Prompt for password if needed
      const password = null
      //  await new Promise((resolve) => {
      //   Alert.prompt(
      //     'Bluetooth Password',
      //     'Please enter the password for the device:',
      //     [
      //       {
      //         text: 'Cancel',
      //         onPress: () => resolve(null),
      //         style: 'cancel',
      //       },
      //       {
      //         text: 'OK',
      //         onPress: (text) => resolve(text),
      //       },
      //     ],
      //     'plain-text'
      //   );
      // });

      console.log("Kontrolü geçti")

      if (password === null) {
        setIsConnecting(false);
        return;
      }

      const connectedDevice = await manager.connectToDevice(device.id, {
        autoConnect: false,
        requestMtu: 512,
      });

      setConnectedDevice(connectedDevice);
      Alert.alert('Connected', `Successfully connected to ${device.name || 'Device'}`);
    } catch (error) {
      console.error('Connection failed', error);
      Alert.alert('Connection Failed', 'Could not connect to the device.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Bluetooth Devices:</Text>
      <Button title="Scan for Devices" onPress={scanForDevices} />
      {isConnecting ? <Text>Connecting...</Text> : null}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.deviceButton} onPress={() => connectToDevice(item)}>
            <Text>{item.name || 'Unknown Device'}</Text>
            <Text>{item.id}</Text>
          </TouchableOpacity>
        )}
      />
      <Button
        title="Go to Details"
        onPress={() => navigation.navigate('SecondPage')}
      />
    </View>
  );
}

// Top Tabs için ekran bileşenleri
function SettingsScreen1() {
  const [cellsCollapsed, setCellsCollapsed] = useState(true);
  const [tempsCollapsed, setTempsCollapsed] = useState(true);

  return (
    <View style={styles.container}>
      {/* Cells Başlığı */}
      <TouchableOpacity style={styles.header} onPress={() => setCellsCollapsed(!cellsCollapsed)}>
        <Text style={styles.headerText}>Cells</Text>
        <Icon name={cellsCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'} size={24} color="#000" />
      </TouchableOpacity>
      <Collapsible collapsed={cellsCollapsed}>
        <FlatList
          data={batteryCells}
          renderItem={({ item }) => (
            <BatteryCell voltage={item.voltage} />
          )}
          keyExtractor={item => item.id}
          numColumns={2}
        />
      </Collapsible>

      {/* Temps Başlığı */}
      <TouchableOpacity style={styles.header} onPress={() => setTempsCollapsed(!tempsCollapsed)}>
        <Text style={styles.headerText}>Temps</Text>
        <Icon name={tempsCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'} size={24} color="#000" />
      </TouchableOpacity>
      <Collapsible collapsed={tempsCollapsed}>
        <FlatList
          data={temperatures}
          renderItem={({ item }) => (
            <Temperature temp={item.temp} />
          )}
          keyExtractor={item => item.id}
          numColumns={2}
        />
      </Collapsible>
    </View>
  );
}

function SettingsScreen2() {
  return (
    <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen 2</Text>
    </SafeAreaView>
  );
}

function SettingsScreen3() {
  return (
    <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen 3</Text>
    </SafeAreaView>
  );
}

// Stack Navigator
const Stack = createNativeStackNavigator();

// Top Tabs Navigator
const Tab = createMaterialTopTabNavigator();

function SettingsTabs() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: '#F7DCB9',
          tabBarStyle: { backgroundColor: '#508D4E' },
          tabBarIndicatorStyle: { backgroundColor: '#1A5319' },
        }}
      >
        <Tab.Screen name="Info" component={SettingsScreen1} />
        <Tab.Screen name="Screen2" component={SettingsScreen2} />
        <Tab.Screen name="Settings" component={SettingsScreen3} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// Ana Uygulama Bileşeni
function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar backgroundColor="#1A5319" style="light" />
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Zeugma BMS',
              headerStyle: {
                backgroundColor: '#508D4E',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen
            name="SecondPage"
            component={SettingsTabs} // Settings ekranını top tabs navigatörü ile değiştirdik
            options={{ headerShown: false }} // Header'ı gizle
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D6EFD8"
  },
  header: {
    padding: 10,
    backgroundColor: '#80AF81',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginTop: 8
  },
  headerText: {
    fontSize: 18,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: "#80AF12"
  },
  cellText: {
    fontSize: 16,
  },
  searchingText: {
    fontSize: 16
  },
  deviceButton: {
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    margin: 5,
    alignItems: 'center',
  }
});

export default App;
