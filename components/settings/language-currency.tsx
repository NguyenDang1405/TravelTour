import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LanguageCurrencyProps {
  language?: string;
  currency?: string;
  onLanguageChange?: (language: string) => void;
  onCurrencyChange?: (currency: string) => void;
}

const languages = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

const currencies = [
  { code: 'VND', label: 'Việt Nam Đồng (₫)', symbol: '₫' },
  { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { code: 'KRW', label: 'South Korean Won (₩)', symbol: '₩' },
  { code: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥' },
];

export default function LanguageCurrency({
  language = 'vi',
  currency = 'VND',
  onLanguageChange,
  onCurrencyChange,
}: LanguageCurrencyProps) {
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);

  const selectedLanguageData = languages.find((l) => l.code === selectedLanguage);
  const selectedCurrencyData = currencies.find((c) => c.code === selectedCurrency);

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
    onLanguageChange?.(langCode);
    setShowLanguageModal(false);
  };

  const handleCurrencySelect = (currCode: string) => {
    setSelectedCurrency(currCode);
    onCurrencyChange?.(currCode);
    setShowCurrencyModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
        <Text style={styles.headerText}>Ngôn ngữ & Tiền tệ</Text>
      </View>

      <View style={styles.content}>
        {/* Language */}
        <TouchableOpacity
          style={styles.optionItem}
          onPress={() => setShowLanguageModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="language-outline" size={20} color={COLORS.primary} />
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Ngôn ngữ</Text>
              <Text style={styles.optionValue}>
                {selectedLanguageData?.flag} {selectedLanguageData?.label}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Currency */}
        <TouchableOpacity
          style={styles.optionItem}
          onPress={() => setShowCurrencyModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Tiền tệ</Text>
              <Text style={styles.optionValue}>
                {selectedCurrencyData?.symbol} {selectedCurrencyData?.code}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngôn ngữ</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.optionsList}>
              {languages.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    onPress={() => handleLanguageSelect(lang.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionFlag}>{lang.flag}</Text>
                    <Text
                      style={[
                        styles.optionRowText,
                        isSelected && styles.optionRowTextSelected,
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COLORS.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCurrencyModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn tiền tệ</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.optionsList}>
              {currencies.map((curr) => {
                const isSelected = selectedCurrency === curr.code;
                return (
                  <TouchableOpacity
                    key={curr.code}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    onPress={() => handleCurrencySelect(curr.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionSymbol}>{curr.symbol}</Text>
                    <View style={styles.optionRowTextContainer}>
                      <Text
                        style={[
                          styles.optionRowText,
                          isSelected && styles.optionRowTextSelected,
                        ]}
                      >
                        {curr.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COLORS.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  optionsList: {
    paddingTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  optionRowSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  optionFlag: {
    fontSize: 24,
  },
  optionSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    minWidth: 30,
  },
  optionRowTextContainer: {
    flex: 1,
  },
  optionRowText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  optionRowTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
});

