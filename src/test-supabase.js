import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('Using Supabase URL:', supabaseUrl);

// Initialize Supabase client with anon key
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testSupabaseConnection() {
  try {
    // Test bucket listing
    console.log('\nTesting bucket listing...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) throw bucketsError;
    console.log('Available buckets:', buckets.map(b => b.name));

    // Test file upload
    console.log('\nTesting file upload...');
    const testContent = 'This is a test file content';
    const testBuffer = Buffer.from(testContent);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('files')
      .upload('test.txt', testBuffer, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) throw uploadError;
    console.log('File uploaded successfully:', uploadData);

    // Test getting public URL
    console.log('\nTesting public URL retrieval...');
    const { data: { publicUrl } } = supabase
      .storage
      .from('files')
      .getPublicUrl('test.txt');
    
    console.log('Public URL:', publicUrl);

    // Test file deletion
    console.log('\nTesting file deletion...');
    const { error: deleteError } = await supabase
      .storage
      .from('files')
      .remove(['test.txt']);

    if (deleteError) throw deleteError;
    console.log('File deleted successfully');

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSupabaseConnection(); 