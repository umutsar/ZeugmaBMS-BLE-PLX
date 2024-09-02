import { BleManager } from 'react-native-ble-plx'



class BLEServiceInstance {
    manager: BleManager
  
    constructor() {
      this.manager = new BleManager()
    }
  }
  
  export const BLEService = new BLEServiceInstance()