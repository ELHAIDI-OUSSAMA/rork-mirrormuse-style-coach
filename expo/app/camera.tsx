import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Zap,
  ZapOff,
  Timer,
  Grid3x3,
  RefreshCw,
  Camera as CameraIcon,
} from 'lucide-react-native';
import appColors from '@/constants/Colors';

let CameraView: any = null;
let useCameraPermissions: any = null;

if (Platform.OS !== 'web') {
  try {
    const cameraModule = require('expo-camera');
    CameraView = cameraModule.CameraView;
    useCameraPermissions = cameraModule.useCameraPermissions;
  } catch (e) {
    console.log('Camera not available');
  }
}

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ occasion: string; vibe: string }>();
  const cameraRef = useRef<any>(null);
  const [permission, setPermission] = useState<{ granted: boolean } | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [timer, setTimer] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' && useCameraPermissions) {
      const [perm, requestPerm] = useCameraPermissions();
      setPermission(perm);
    } else {
      setPermission({ granted: true });
    }
  }, []);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timeout = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timeout);
    } else if (countdown === 0) {
      capturePhoto();
      setCountdown(null);
    }
  }, [countdown]);

  const requestPermission = async () => {
    if (Platform.OS !== 'web' && useCameraPermissions) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setPermission({ granted: status === 'granted' });
    }
  };

  const capturePhoto = async () => {
    if (Platform.OS === 'web') {
      handleWebCapture();
      return;
    }

    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo) {
          router.replace({
            pathname: '/loading' as any,
            params: {
              imageUri: photo.uri,
              occasion: params.occasion,
              vibe: params.vibe,
            },
          });
        }
      } catch (error) {
        console.log('Error taking photo:', error);
        setIsCapturing(false);
      }
    }
  };

  const handleWebCapture = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      router.replace({
        pathname: '/loading' as any,
        params: {
          imageUri: result.assets[0].uri,
          occasion: params.occasion,
          vibe: params.vibe,
        },
      });
    }
  };

  const handleCapture = () => {
    if (timer > 0) {
      setCountdown(timer);
    } else {
      capturePhoto();
    }
  };

  const cycleTimer = () => {
    if (timer === 0) setTimer(3);
    else if (timer === 3) setTimer(10);
    else setTimer(0);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.webSafe}>
          <TouchableOpacity style={styles.webBack} onPress={() => router.back()}>
            <X size={24} color={appColors.text} />
          </TouchableOpacity>
          <View style={styles.webContent}>
            <View style={styles.webIcon}>
              <CameraIcon size={48} color={appColors.primary} />
            </View>
            <Text style={styles.webTitle}>Take a Photo</Text>
            <Text style={styles.webText}>
              Camera preview is not available on web.{'\n'}
              Use the button below to capture your outfit.
            </Text>
            <TouchableOpacity style={styles.webButton} onPress={handleWebCapture}>
              <Text style={styles.webButtonText}>Open Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.webLink} onPress={() => router.back()}>
              <Text style={styles.webLinkText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.permissionSafe}>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to take your mirror selfie and analyze your outfit.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  if (!CameraView) {
    return (
      <View style={styles.permissionContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.permissionSafe}>
          <Text style={styles.permissionTitle}>Camera Not Available</Text>
          <Text style={styles.permissionText}>
            Please use the upload option instead.
          </Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash ? 'on' : 'off'}
      >
        {showGrid && (
          <View style={styles.gridOverlay}>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={[styles.gridCell, styles.gridCellBorder]} />
              <View style={styles.gridCell} />
            </View>
            <View style={[styles.gridRow, styles.gridRowBorder]}>
              <View style={styles.gridCell} />
              <View style={[styles.gridCell, styles.gridCellBorder]} />
              <View style={styles.gridCell} />
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={[styles.gridCell, styles.gridCellBorder]} />
              <View style={styles.gridCell} />
            </View>
          </View>
        )}

        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        <SafeAreaView style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <X size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.topControls}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setFlash(!flash)}>
                {flash ? (
                  <Zap size={24} color={appColors.warning} />
                ) : (
                  <ZapOff size={24} color="white" />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={cycleTimer}>
                <Timer size={24} color={timer > 0 ? appColors.warning : 'white'} />
                {timer > 0 && <Text style={styles.timerBadge}>{timer}s</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={() => setShowGrid(!showGrid)}>
                <Grid3x3 size={24} color={showGrid ? appColors.primary : 'white'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>Stand back so your full outfit fits in frame</Text>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <RefreshCw size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={isCapturing || countdown !== null}
            >
              <View style={styles.captureOuter}>
                <View style={styles.captureInner} />
              </View>
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topControls: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 10,
    color: appColors.warning,
    fontWeight: 'bold' as const,
  },
  tipContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  tipText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 24,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  placeholder: {
    width: 50,
    height: 50,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridRowBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  gridCell: {
    flex: 1,
  },
  gridCellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold' as const,
    color: 'white',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  permissionSafe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: appColors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: appColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: appColors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: appColors.text,
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 14,
    color: appColors.primary,
  },
  webContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  webSafe: {
    flex: 1,
  },
  webBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: appColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
  },
  webContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  webIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: appColors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: appColors.text,
    marginBottom: 12,
  },
  webText: {
    fontSize: 16,
    color: appColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  webButton: {
    backgroundColor: appColors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  webButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: appColors.text,
  },
  webLink: {
    marginTop: 16,
  },
  webLinkText: {
    fontSize: 14,
    color: appColors.primary,
  },
});
