export type DeviceInfo = {
  fw_version: string
  hw_model_name: string
  session_id: string
  fw_status?: number
  hw_model_no?: number
  hw_model_variant?: number
  fw_feature_flags?: string
}

export type DeviceTimeInfo = {
  time: number
  clock_offset: number
  rtd: number
}

export type OffsetResponse = {
  offset: number
}

export type HspState = {
  play_state: number | string
  pause_on_starving?: boolean
  points: number
  max_points: number
  current_point: number
  current_time: number
  loop: boolean
  playback_rate: number
  first_point_time: number
  last_point_time: number
  stream_id: number | string
  tail_point_stream_index: number
  tail_point_stream_index_threshold: number
}

export type StrokeSettings = {
  min: number
  max: number
  min_absolute?: number
  max_absolute?: number
}

export type ApiResponse<T = unknown> = {
  result?: T
  error?: {
    code: number
    name: string
    message: string
    connected: boolean
    data?: unknown
  }
}

export class HandyApi {
  private readonly baseUrl: string
  private readonly applicationId: string
  private connectionKey: string
  private serverTimeOffset = 0

  constructor(baseUrl: string, applicationId: string, connectionKey = '') {
    this.baseUrl = baseUrl
    this.applicationId = applicationId
    this.connectionKey = connectionKey
  }

  /**
   * Set the connection key for API requests
   */
  public setConnectionKey(connectionKey: string): void {
    this.connectionKey = connectionKey
  }

  /**
   * Get the connection key
   */
  public getConnectionKey(): string {
    return this.connectionKey
  }

  /**
   * Set the server time offset for synchronization
   */
  public setServerTimeOffset(offset: number): void {
    this.serverTimeOffset = offset
  }

  /**
   * Get the server time offset
   */
  public getServerTimeOffset(): number {
    return this.serverTimeOffset
  }

  /**
   * Estimate the current server time based on local time and offset
   */
  public estimateServerTime(): number {
    return Math.round(Date.now() + this.serverTimeOffset)
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'X-Connection-Key': this.connectionKey,
      Authorization: `Bearer ${this.applicationId}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  /**
   * Make an API request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      })

      const data = await response.json()
      return data as ApiResponse<T>
    } catch (error) {
      console.error(`API error (${endpoint}):`, error)
      throw error
    }
  }

  /**
   * Check if the device is connected
   */
  public async isConnected(): Promise<boolean> {
    try {
      const response = await this.request<{ connected: boolean }>('/connected')
      return !!response.result?.connected
    } catch (error) {
      console.error('Handy: Error checking connection:', error)
      return false
    }
  }

  /**
   * Get device information
   */
  public async getDeviceInfo(): Promise<DeviceInfo | null> {
    try {
      const response = await this.request<DeviceInfo>('/info')
      return response.result || null
    } catch (error) {
      console.error('Handy: Error getting device info:', error)
      return null
    }
  }

  /**
   * Get the current device mode
   */
  public async getMode(): Promise<number | null> {
    try {
      const response = await this.request<{ mode: number }>('/mode')
      return response.result?.mode ?? null
    } catch (error) {
      console.error('Handy: Error getting mode:', error)
      return null
    }
  }

  /**
   * Setup script for HSSP playback
   */
  public async setupScript(scriptUrl: string): Promise<boolean> {
    try {
      const response = await this.request<HspState>('/hssp/setup', {
        method: 'PUT',
        body: JSON.stringify({ url: scriptUrl }),
      })
      return !!response.result?.stream_id
    } catch (error) {
      console.error('Handy: Error setting up script:', error)
      return false
    }
  }

  /**
   * Start playback with the HSSP protocol
   */
  public async play(
    videoTime: number,
    playbackRate = 1.0,
    loop = false,
  ): Promise<HspState | null> {
    try {
      const response = await this.request<HspState>('/hssp/play', {
        method: 'PUT',
        body: JSON.stringify({
          start_time: Math.round(videoTime * 1000),
          server_time: this.estimateServerTime(),
          playback_rate: playbackRate,
          loop,
        }),
      })
      return response.result || null
    } catch (error) {
      console.error('Handy: Error starting playback:', error)
      return null
    }
  }

  /**
   * Stop playback
   */
  public async stop(): Promise<HspState | null> {
    try {
      const response = await this.request<HspState>('/hssp/stop', {
        method: 'PUT',
      })
      return response.result || null
    } catch (error) {
      console.error('Handy: Error stopping playback:', error)
      return null
    }
  }

  /**
   * Synchronize the device's time with video time
   */
  public async syncVideoTime(
    videoTime: number,
    filter = 0.5,
  ): Promise<boolean> {
    try {
      const response = await this.request<HspState>('/hssp/synctime', {
        method: 'PUT',
        body: JSON.stringify({
          current_time: Math.round(videoTime * 1000),
          server_time: this.estimateServerTime(),
          filter,
        }),
      })
      return !!response.result?.stream_id
    } catch (error) {
      console.error('Handy: Error syncing video time:', error)
      return false
    }
  }

  /**
   * Get the current time offset
   */
  public async getOffset(): Promise<number> {
    try {
      const response = await this.request<OffsetResponse>('/hstp/offset')
      return response.result?.offset || 0
    } catch (error) {
      console.error('Handy: Error getting offset:', error)
      return 0
    }
  }

  /**
   * Set the time offset
   */
  public async setOffset(offset: number): Promise<boolean> {
    try {
      const response = await this.request<string>('/hstp/offset', {
        method: 'PUT',
        body: JSON.stringify({ offset }),
      })
      return response.result === 'ok'
    } catch (error) {
      console.error('Handy: Error setting offset:', error)
      return false
    }
  }

  /**
   * Get the current stroke settings
   */
  public async getStrokeSettings(): Promise<StrokeSettings | null> {
    try {
      const response = await this.request<StrokeSettings>('/slider/stroke')
      return response.result || null
    } catch (error) {
      console.error('Handy: Error getting stroke settings:', error)
      return null
    }
  }

  /**
   * Set the stroke settings
   */
  public async setStrokeSettings(settings: {
    min: number
    max: number
  }): Promise<StrokeSettings | null> {
    try {
      const response = await this.request<StrokeSettings>('/slider/stroke', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      return response.result || null
    } catch (error) {
      console.error('Handy: Error setting stroke settings:', error)
      return null
    }
  }

  /**
   * Get the server time for synchronization calculations
   */
  public async getServerTime(): Promise<number | null> {
    try {
      const response = await fetch(`${this.baseUrl}/servertime`)
      const data = await response.json()
      return data.server_time || null
    } catch (error) {
      console.error('Handy: Error getting server time:', error)
      return null
    }
  }

  /**
   * Synchronize time with the server
   * Returns calculated server time offset
   */
  public async syncTime(sampleCount = 10): Promise<number> {
    try {
      const samples: { rtd: number; offset: number }[] = []

      for (let i = 0; i < sampleCount; i++) {
        try {
          const start = Date.now()
          const serverTime = await this.getServerTime()

          if (!serverTime) continue

          const end = Date.now()
          const rtd = end - start // Round trip delay
          const serverTimeEst = rtd / 2 + serverTime

          samples.push({
            rtd,
            offset: serverTimeEst - end,
          })
        } catch (error) {
          console.warn('Error during time sync sample:', error)
          // Continue with other samples
        }
      }

      // Sort samples by RTD (Round Trip Delay) to get the most accurate ones
      if (samples.length > 0) {
        samples.sort((a, b) => a.rtd - b.rtd)

        // Use 80% of the most accurate samples if we have enough
        const usableSamples =
          samples.length > 3
            ? samples.slice(0, Math.ceil(samples.length * 0.8))
            : samples

        const averageOffset =
          usableSamples.reduce((acc, sample) => acc + sample.offset, 0) /
          usableSamples.length

        this.serverTimeOffset = averageOffset
        return averageOffset
      }

      return this.serverTimeOffset
    } catch (error) {
      console.error('Error syncing time:', error)
      return this.serverTimeOffset
    }
  }

  /**
   * Create an EventSource for server-sent events
   */
  public createEventSource(): EventSource {
    return new EventSource(
      `${this.baseUrl}/sse?ck=${this.connectionKey}&apikey=${this.applicationId}`,
    )
  }
}

// Export a factory function to create HandyApi instances
export const createHandyApi = (
  baseUrl: string,
  applicationId: string,
  connectionKey = '',
): HandyApi => {
  return new HandyApi(baseUrl, applicationId, connectionKey)
}
