const fs = require('fs');
let content = fs.readFileSync('app/(tabs)/index.web.tsx', 'utf8');

// 1. Add Linking
content = content.replace('View,\n} from \'react-native\';', 'View,\n  Linking,\n} from \'react-native\';');

// 2. Add useRef for scrollView
content = content.replace(
  'const [toInputPosition, setToInputPosition] = useState({ x: 0, y: 0, width: 0 });', 
  'const [toInputPosition, setToInputPosition] = useState({ x: 0, y: 0, width: 0 });\n  const scrollViewRef = useRef<any>(null);'
);

// 3. Attach ref
content = content.replace(
  '<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>',
  '<ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>'
);

// 4. Update Scroll to top
content = content.replace(
  "onPress={() => window.scrollTo({ top: 0, behavior: 'smooth' })}",
  "onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}"
);

// 5. Update Phone Call
const phoneTarget = `<TouchableOpacity style={footerStyles.floatBtn}>
            <Ionicons name="call" size={24} color={COLORS.white} />
          </TouchableOpacity>`;
const phoneReplace = `<TouchableOpacity style={footerStyles.floatBtn} onPress={() => Linking.openURL('tel:0905664702')}>
            <Ionicons name="call" size={24} color={COLORS.white} />
          </TouchableOpacity>`;
content = content.replace(phoneTarget, phoneReplace);

fs.writeFileSync('app/(tabs)/index.web.tsx', content);
console.log("Updated index.web.tsx successfully.");
