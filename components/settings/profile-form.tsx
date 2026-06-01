import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface ProfileFormProps {
  name?: string;
  email?: string;
  avatar?: string;
  onNameChange?: (name: string) => void;
  onAvatarChange?: (avatar: string) => void;
  onSave?: (name?: string, avatar?: string) => void;
}

export default function ProfileForm({
  name = '',
  email = '',
  avatar,
  onNameChange,
  onAvatarChange,
  onSave,
}: ProfileFormProps) {
  const [localName, setLocalName] = useState(name);
  const [localAvatar, setLocalAvatar] = useState(avatar || '');
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [avatarInput, setAvatarInput] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadImage = useAction(api.upload.uploadImageToCloudinary);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Create file input handler
  const createFileInput = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = (e: any) => {
      handleFileSelect(e);
      // Clean up after use
      setTimeout(() => {
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      }, 100);
    };
    document.body.appendChild(input);
    return input;
  };

  // Update local state when props change - prioritize Convex avatar
  useEffect(() => {
    setLocalName(name);
    // Always sync localAvatar with prop avatar (from Convex)
    // Logic: If Convex has avatar -> use it, else keep localAvatar (might be Clerk or empty)
    // This ensures UI updates when avatar is saved to Convex
    if (avatar) {
      // Convex has avatar - use it (this is the source of truth)
      setLocalAvatar(avatar);
      console.log('🔄 ProfileForm: Syncing localAvatar with Convex avatar:', avatar.substring(0, 50) + '...');
    } else if (!localAvatar) {
      // No Convex avatar and no localAvatar - clear it
      setLocalAvatar('');
      console.log('🔄 ProfileForm: Clearing localAvatar (no avatar from Convex)');
    }
    // If no Convex avatar but localAvatar exists, keep localAvatar (might be Clerk avatar)
  }, [name, avatar]);

  const handleNameChange = (text: string) => {
    setLocalName(text);
    const nameChanged = text !== name;
    const avatarChanged = localAvatar !== (avatar || '');
    setHasChanges(nameChanged || avatarChanged);
    onNameChange?.(text);
    
    // Auto-save name after user stops typing (debounce 1.5 seconds)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (text.trim() !== name) {
        console.log('💾 Auto-saving name:', text.trim());
        setIsSaving(true);
        try {
          await onSave?.(text.trim(), localAvatar);
          setHasChanges(false);
          console.log('✅ Name auto-saved successfully');
        } catch (error: any) {
          console.error('❌ Error auto-saving name:', error);
          // Don't show alert for auto-save errors, just log
        } finally {
          setIsSaving(false);
        }
      }
    }, 1500); // Wait 1.5 seconds after user stops typing
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleAvatarInputChange = (text: string) => {
    setAvatarInput(text);
  };

  const handleAvatarInputSubmit = async () => {
    if (avatarInput.trim()) {
      // Validate URL
      try {
        new URL(avatarInput.trim());
        const newAvatarUrl = avatarInput.trim();
        setLocalAvatar(newAvatarUrl);
        setShowAvatarInput(false);
        setAvatarInput('');
        const nameChanged = localName !== name;
        setHasChanges(nameChanged || newAvatarUrl !== (avatar || ''));
        onAvatarChange?.(newAvatarUrl);
        
        // Auto-save avatar immediately
        console.log('💾 Auto-saving avatar URL:', newAvatarUrl);
        setIsSaving(true);
        try {
          await onSave?.(localName, newAvatarUrl);
          setHasChanges(false);
          console.log('✅ Avatar URL auto-saved successfully');
        } catch (error: any) {
          console.error('❌ Error auto-saving avatar:', error);
          Alert.alert('Lỗi', 'Không thể lưu ảnh đại diện. Vui lòng thử lại.');
        } finally {
          setIsSaving(false);
        }
      } catch (error) {
        Alert.alert('Lỗi', 'URL không hợp lệ. Vui lòng nhập URL đầy đủ (ví dụ: https://example.com/image.jpg)');
      }
    } else {
      setShowAvatarInput(false);
      setAvatarInput('');
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'web') {
      // Directly open file picker
      console.log('📁 Opening file picker...');
      const input = createFileInput();
      if (input) {
        input.click();
      }
    } else {
      // Mobile: Show image picker
      handlePickImage();
    }
  };

  const handleAvatarLongPress = () => {
    // Long press to show URL input option
    if (Platform.OS === 'web') {
      Alert.alert(
        'Chọn ảnh đại diện',
        'Bạn muốn nhập URL hay chọn ảnh từ máy?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Nhập URL', onPress: () => {
            setShowAvatarInput(true);
            setAvatarInput(localAvatar || '');
          }},
          { text: 'Chọn từ máy', onPress: () => {
            console.log('📁 Opening file picker...');
            const input = createFileInput();
            if (input) {
              input.click();
            }
          }},
        ]
      );
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          await handleUploadImage(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const handleFileSelect = async (event: any) => {
    console.log('📁 File selected:', event);
    const file = event.target?.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('📄 File info:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Alert.alert('Lỗi', 'Vui lòng chọn file ảnh (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Alert.alert('Lỗi', 'Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      console.log('📖 Reading file as base64...');
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        console.log('✅ File read successfully, base64 length:', base64.length);
        if (base64) {
          await handleUploadImage(base64);
        } else {
          Alert.alert('Lỗi', 'Không thể đọc file. Vui lòng thử lại.');
        }
      };
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        Alert.alert('Lỗi', 'Không thể đọc file. Vui lòng thử lại.');
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('❌ Error reading file:', error);
      Alert.alert('Lỗi', 'Không thể đọc file. Vui lòng thử lại.');
    }
  };

  const handleUploadImage = async (imageData: string) => {
    console.log('🚀 Starting upload, imageData length:', imageData.length);
    setIsUploading(true);
    try {
      console.log('📤 Calling uploadImage action...');
      const result = await uploadImage({ imageData });
      console.log('✅ Upload successful:', result);
      const newAvatarUrl = result.url;
      setLocalAvatar(newAvatarUrl);
      setShowAvatarInput(false);
      setAvatarInput('');
      const nameChanged = localName !== name;
      setHasChanges(nameChanged || newAvatarUrl !== (avatar || ''));
      onAvatarChange?.(newAvatarUrl);
      
      // Auto-save avatar immediately after upload
      console.log('💾 Auto-saving avatar to Convex...', { avatarUrl: newAvatarUrl });
      setIsSaving(true);
      try {
        await onSave?.(localName, newAvatarUrl);
        setHasChanges(false);
        console.log('✅ Avatar saved successfully to Convex');
        // Don't show alert for auto-save, just silently save
      } catch (saveError: any) {
        console.error('❌ Error auto-saving avatar:', saveError);
        Alert.alert('Lỗi', 'Ảnh đã được tải lên nhưng không thể lưu vào hồ sơ. Vui lòng thử lại.');
      } finally {
        setIsSaving(false);
      }
    } catch (error: any) {
      console.error('❌ Error uploading image:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || error?.toString() || 'Không thể tải ảnh lên. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setLocalAvatar('');
    setShowAvatarInput(false);
    setAvatarInput('');
    const nameChanged = localName !== name;
    setHasChanges(nameChanged || !!avatar);
    onAvatarChange?.('');
    
    // Auto-save removal of avatar
    console.log('💾 Auto-saving avatar removal');
    setIsSaving(true);
    try {
      await onSave?.(localName, '');
      setHasChanges(false);
      console.log('✅ Avatar removal auto-saved successfully');
    } catch (error: any) {
      console.error('❌ Error auto-saving avatar removal:', error);
      Alert.alert('Lỗi', 'Không thể xóa ảnh đại diện. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-outline" size={24} color={COLORS.primary} />
        <Text style={styles.headerText}>Thông tin cá nhân</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            onLongPress={handleAvatarLongPress}
            activeOpacity={0.7}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (() => {
              // Simple logic: Convex avatar first, localAvatar as fallback
              // This ensures Cloudinary avatar (from Convex) is always used when available
              const displayAvatar = avatar || localAvatar;
              
              // Debug logging
              console.log('🖼️ ProfileForm avatar display:', {
                hasPropAvatar: !!avatar,
                propAvatar: avatar ? avatar.substring(0, 50) + '...' : 'none',
                hasLocalAvatar: !!localAvatar,
                localAvatar: localAvatar ? localAvatar.substring(0, 50) + '...' : 'none',
                displayAvatar: displayAvatar ? displayAvatar.substring(0, 50) + '...' : 'none',
                usingConvex: !!avatar,
                usingLocal: !avatar && !!localAvatar,
              });
              
              return displayAvatar ? (
                <Image 
                  source={{ uri: displayAvatar }} 
                  style={styles.avatar}
                  onError={(e) => {
                    console.error('❌ Error loading avatar:', e.nativeEvent.error);
                    Alert.alert('Lỗi', 'Không thể tải ảnh. Vui lòng kiểm tra lại URL.');
                  }}
                  onLoad={() => {
                    console.log('✅ Avatar loaded successfully from:', displayAvatar.substring(0, 50) + '...');
                  }}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={COLORS.textSecondary} />
                </View>
              );
            })()}
            {!isUploading && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.avatarHintContainer}>
            <Text style={styles.avatarHint}>
              {isUploading ? 'Đang tải ảnh lên...' : 'Nhấn để chọn ảnh từ máy'}
            </Text>
            {Platform.OS === 'web' && !isUploading && (
              <TouchableOpacity
                onPress={() => {
                  setShowAvatarInput(true);
                  setAvatarInput(localAvatar || '');
                }}
                style={styles.urlButton}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={14} color={COLORS.primary} />
                <Text style={styles.urlButtonText}>Nhập URL</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Avatar URL Input */}
          {showAvatarInput && (
            <View style={styles.avatarInputContainer}>
              <Text style={styles.avatarInputLabel}>Nhập URL ảnh đại diện</Text>
              <View style={styles.avatarInputRow}>
                <TextInput
                  style={styles.avatarInput}
                  value={avatarInput}
                  onChangeText={handleAvatarInputChange}
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <TouchableOpacity
                  style={styles.avatarInputButton}
                  onPress={handleAvatarInputSubmit}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.avatarInputButton, styles.avatarInputButtonCancel]}
                  onPress={() => {
                    setShowAvatarInput(false);
                    setAvatarInput('');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              {localAvatar && (
                <TouchableOpacity
                  style={styles.removeAvatarButton}
                  onPress={handleRemoveAvatar}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                  <Text style={styles.removeAvatarText}>Xóa ảnh đại diện</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            value={localName}
            onChangeText={handleNameChange}
            placeholder="Nhập họ và tên"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Email (read-only) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnlyInput}>
            <Text style={styles.readOnlyText}>{email}</Text>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.hint}>Email không thể thay đổi</Text>
        </View>

        {/* Save Status / Manual Save Button */}
        {isSaving ? (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.savingText}>Đang lưu...</Text>
          </View>
        ) : hasChanges ? (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={async () => {
              setIsSaving(true);
              try {
                await onSave?.(localName, localAvatar);
                setHasChanges(false);
              } catch (error: any) {
                console.error('Error saving:', error);
                Alert.alert('Lỗi', 'Không thể lưu thông tin. Vui lòng thử lại.');
              } finally {
                setIsSaving(false);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    gap: 20,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surfaceLight,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  avatarHintContainer: {
    alignItems: 'center',
    gap: 8,
  },
  avatarHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
  },
  urlButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  readOnlyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  savingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  avatarInputContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    gap: 12,
  },
  avatarInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  avatarInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  avatarInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  avatarInputButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInputButtonCancel: {
    backgroundColor: COLORS.surfaceLight,
  },
  removeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeAvatarText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
  },
});

