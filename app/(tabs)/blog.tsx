import { Platform } from 'react-native';
import BlogWeb from './blog.web';
import BlogMobile from './blog.mobile';

export default function BlogScreen() {
  if (Platform.OS === 'web') {
    return <BlogWeb />;
  }
  
  return <BlogMobile />;
}

