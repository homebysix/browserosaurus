import { createReducer } from '@reduxjs/toolkit'

import type { AppName } from '../../config/apps.js'
import {
  changedPickerWindowBounds,
  readiedApp,
  receivedRendererStartupSignal,
  retrievedInstalledApps,
} from '../../main/state/actions.js'
import {
  clickedDonate,
  clickedMaybeLater,
} from '../../renderers/picker/state/actions.js'
import {
  confirmedReset,
  removedApp,
  reorderedApp,
  restoredApp,
  updatedHotCode,
} from '../../renderers/prefs/state/actions.js'

type Storage = {
  apps: {
    name: AppName
    hotCode: string | null
    isInstalled: boolean
    userRemoved: boolean
  }[]
  supportMessage: number
  isSetup: boolean
  height: number
}

const defaultStorage: Storage = {
  apps: [],
  height: 200,
  isSetup: false,
  supportMessage: 0,
}

const storage = createReducer<Storage>(defaultStorage, (builder) =>
  builder
    .addCase(readiedApp, (state) => {
      state.isSetup = true
    })

    .addCase(confirmedReset, () => defaultStorage)

    .addCase(receivedRendererStartupSignal, (_, action) => {
      const storage = action.payload.storage
      // Migrate existing data to include userRemoved field
      const migratedApps = storage.apps.map((app) => ({
        ...app,
        userRemoved: app.userRemoved ?? false,
      }))
      return {
        ...storage,
        apps: migratedApps,
      }
    })

    .addCase(retrievedInstalledApps, (state, action) => {
      const installedAppNames = action.payload

      for (const storedApp of state.apps) {
        const isSystemInstalled = installedAppNames.includes(storedApp.name)
        // Only show app if it's installed AND not manually removed by user
        storedApp.isInstalled = isSystemInstalled && !storedApp.userRemoved
      }

      for (const installedAppName of installedAppNames) {
        const installedAppInStorage = state.apps.some(
          ({ name }) => name === installedAppName,
        )

        if (!installedAppInStorage) {
          state.apps.push({
            hotCode: null,
            isInstalled: true,
            name: installedAppName,
            userRemoved: false,
          })
        }
      }
    })

    .addCase(updatedHotCode, (state, action) => {
      const hotCode = action.payload.value

      const appWithSameHotCodeIndex = state.apps.findIndex(
        (app) => app.hotCode === hotCode,
      )

      if (appWithSameHotCodeIndex !== -1) {
        state.apps[appWithSameHotCodeIndex].hotCode = null
      }

      const appIndex = state.apps.findIndex(
        (app) => app.name === action.payload.appName,
      )

      state.apps[appIndex].hotCode = hotCode
    })

    .addCase(clickedDonate, (state) => {
      state.supportMessage = -1
    })

    .addCase(clickedMaybeLater, (state) => {
      state.supportMessage = Date.now()
    })

    .addCase(changedPickerWindowBounds, (state, action) => {
      state.height = action.payload.height
    })

    .addCase(reorderedApp, (state, action) => {
      const sourceIndex = state.apps.findIndex(
        (app) => app.name === action.payload.sourceName,
      )

      const destinationIndex = state.apps.findIndex(
        (app) => app.name === action.payload.destinationName,
      )

      const [removed] = state.apps.splice(sourceIndex, 1)
      state.apps.splice(destinationIndex, 0, removed)
    })

    .addCase(removedApp, (state, action) => {
      const appIndex = state.apps.findIndex(
        (app) => app.name === action.payload.appName,
      )

      if (appIndex !== -1) {
        state.apps[appIndex].isInstalled = false
        state.apps[appIndex].userRemoved = true
      }
    })

    .addCase(restoredApp, (state, action) => {
      const appIndex = state.apps.findIndex(
        (app) => app.name === action.payload.appName,
      )

      if (appIndex !== -1) {
        state.apps[appIndex].userRemoved = false
        // Check if the app is still actually installed on the system
        // This will be updated correctly on the next scan
        state.apps[appIndex].isInstalled = true
      }
    }),
)

export { defaultStorage, Storage, storage }
