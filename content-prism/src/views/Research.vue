<template>
  <div class="research">
    <!-- Add Font Awesome -->
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
    />

    <h1>Research</h1>

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else>
      <div class="research-selector">
        <select v-model="selectedResearchId" class="research-dropdown">
          <option value="create-new">Create New Research</option>
          <option v-if="!researchList.length" value="">No existing entries</option>
          <option v-for="research in researchList" :key="research.id" :value="research.id">
            {{ research.title }} - {{ formatDate(research.created_at) }}
          </option>
        </select>
      </div>

      <div v-if="selectedResearchId === 'create-new'" class="research-form">
        <h2>New Research</h2>
        <div class="form-group">
          <label for="title">Title</label>
          <input
            id="title"
            v-model="newResearch.title"
            type="text"
            placeholder="Enter research title..."
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="main-text">Research Content</label>
          <textarea
            id="main-text"
            v-model="newResearch.main_text"
            rows="10"
            placeholder="Enter your research content..."
          ></textarea>
        </div>
        <button @click="createResearch" class="submit-button">
          Save
        </button>
      </div>

      <div v-else-if="selectedResearchId" class="research-content">
        <h2>{{ selectedResearch?.title }}</h2>
        <div class="content-display" @click="showLightbox = true">
          {{ truncateText(selectedResearch?.main_text) }}
        </div>

        <!-- Lightbox -->
        <div v-if="showLightbox" class="lightbox" @click="showLightbox = false">
          <div class="lightbox-content" @click.stop>
            <div class="lightbox-header">
              <h3>{{ selectedResearch?.title }}</h3>
              <button class="close-button" @click="showLightbox = false">&times;</button>
            </div>
            <div class="lightbox-body">
              {{ selectedResearch?.main_text }}
            </div>
          </div>
        </div>

        <!-- Blog Ideas Section -->
        <div class="blog-ideas-section">
          <h3>Blog Ideas</h3>
          <div class="blog-ideas-header">
            <button @click="showPromptLightbox = true; fetchUserPrompt()" class="prompt-button">
              <i class="fas fa-cog"></i> Prompt
            </button>
            <button @click="generateBlogIdeas" class="generate-button" :disabled="generating">
              {{ generating ? 'Generating...' : 'Generate Blog Ideas' }}
            </button>
          </div>

          <!-- Prompt Lightbox -->
          <div v-if="showPromptLightbox" class="lightbox" @click="showPromptLightbox = false">
            <div class="lightbox-content" @click.stop>
              <div class="lightbox-header">
                <h3>Edit Blog Prompt</h3>
                <button class="close-button" @click="showPromptLightbox = false">&times;</button>
              </div>
              <div class="lightbox-body">
                <div v-if="promptLoading" class="loading">Loading prompt...</div>
                <div v-else>
                  <textarea
                    v-model="userPrompt"
                    class="prompt-textarea"
                    placeholder="Enter your blog prompt..."
                  ></textarea>
                  <button @click="updateUserPrompt" class="submit-button">Save Prompt</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Blog Ideas List -->
          <div v-if="blogs.length" class="blog-ideas-list">
            <div v-for="blog in blogs" :key="blog.id" class="blog-idea-item">
              <div class="blog-idea-content">
                <textarea
                  v-model="blog.concept"
                  @blur="updateBlogConcept(blog.id, blog.concept)"
                  class="blog-concept-input"
                  placeholder="Enter blog concept..."
                ></textarea>
                <button 
                  @click="deleteBlog(blog.id)" 
                  class="delete-button"
                  title="Delete blog idea"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Success Message -->
          <div v-if="blogIdeas" class="blog-ideas-results">
            <pre>{{ blogIdeas }}</pre>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { supabase } from '../supabase';
import { useAuth } from '../stores/authStore';
import axios from 'axios';

const { user } = useAuth();
const researchList = ref([]);
const selectedResearchId = ref('');
const selectedResearch = ref(null);
const showLightbox = ref(false);
const loading = ref(true);
const newResearch = ref({
  title: '',
  main_text: ''
});

// Blog Ideas related refs
const blogIdeas = ref(null);
const generating = ref(false);
const blogs = ref([]);
let blogSubscription = null;

// Prompt related refs
const showPromptLightbox = ref(false);
const userPrompt = ref('');
const promptLoading = ref(false);

const fetchResearch = async () => {
  if (!user.value) {
    console.log('No user found');
    return;
  }

  try {
    console.log('Fetching research for user:', user.value.id);
    
    // First get the user's institution_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user.value.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    console.log('User profile:', profile);

    if (!profile?.institution_id) {
      console.log('No institution_id found in profile');
      return;
    }

    // Then fetch research for that institution
    const { data, error } = await supabase
      .from('research')
      .select('id, title, created_at')
      .eq('institution_id', profile.institution_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching research:', error);
      throw error;
    }

    console.log('Fetched research data:', data);
    researchList.value = data;
    
    // Set the most recent research as selected if available
    if (data && data.length > 0) {
      selectedResearchId.value = data[0].id;
    }
  } catch (error) {
    console.error('Error in fetchResearch:', error);
  } finally {
    loading.value = false;
  }
};

const createResearch = async () => {
  if (!user.value) {
    console.log('No user found for create');
    return;
  }

  try {
    console.log('Creating research for user:', user.value.id);
    
    // Get the user's institution_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user.value.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    console.log('User profile for create:', profile);

    if (!profile?.institution_id) {
      console.log('No institution_id found in profile for create');
      return;
    }

    // Create new research
    const { data, error } = await supabase
      .from('research')
      .insert([
        {
          title: newResearch.value.title,
          main_text: newResearch.value.main_text,
          institution_id: profile.institution_id,
          user_profile_id: user.value.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating research:', error);
      throw error;
    }

    console.log('Created research:', data);

    // Add to list and select it
    researchList.value.unshift(data);
    selectedResearchId.value = data.id;
    newResearch.value = {
      title: '',
      main_text: ''
    };
  } catch (error) {
    console.error('Error in createResearch:', error);
  }
};

const fetchSelectedResearch = async () => {
  if (!selectedResearchId.value || selectedResearchId.value === 'create-new') {
    selectedResearch.value = null;
    return;
  }

  try {
    const { data, error } = await supabase
      .from('research')
      .select('id, title, main_text, created_at')
      .eq('id', selectedResearchId.value)
      .single();

    if (error) throw error;
    selectedResearch.value = data;
  } catch (error) {
    console.error('Error fetching selected research:', error);
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const truncateText = (text) => {
  if (!text) return '';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
};

watch(selectedResearchId, () => {
  fetchSelectedResearch();
});

// Watch for auth state changes
watch(user, (newUser) => {
  if (newUser) {
    fetchResearch();
  }
});

// Function to fetch blogs for selected research
const fetchBlogs = async () => {
  if (!selectedResearchId.value) return;
  
  try {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('research_id', selectedResearchId.value)
      .order('created_at', { ascending: false });

    if (error) throw error;
    blogs.value = data;
  } catch (error) {
    console.error('Error fetching blogs:', error);
  }
};

// Function to update blog concept
const updateBlogConcept = async (blogId, newConcept) => {
  try {
    const { error } = await supabase
      .from('blogs')
      .update({ concept: newConcept })
      .eq('id', blogId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating blog concept:', error);
  }
};

// Function to delete a blog
const deleteBlog = async (blogId) => {
  try {
    const { error } = await supabase
      .from('blogs')
      .delete()
      .eq('id', blogId);

    if (error) throw error;
    
    // Immediately remove the deleted blog from the local array
    blogs.value = blogs.value.filter(blog => blog.id !== blogId);
  } catch (error) {
    console.error('Error deleting blog:', error);
  }
};

// Setup real-time subscription for blogs
const setupBlogSubscription = () => {
  if (!selectedResearchId.value) return;

  // Clean up existing subscription
  if (blogSubscription) {
    blogSubscription.unsubscribe();
  }

  // Subscribe to changes in the blogs table
  blogSubscription = supabase
    .channel('blogs_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'blogs',
        filter: `research_id=eq.${selectedResearchId.value}`
      },
      (payload) => {
        console.log('Blog change received:', payload);
        fetchBlogs();
      }
    )
    .subscribe((status) => {
      console.log('Blog subscription status:', status);
    });
};

// Watch for selected research changes
watch(selectedResearchId, (newId) => {
  if (newId) {
    fetchBlogs();
    setupBlogSubscription();
  }
});

// Clean up subscription on component unmount
onUnmounted(() => {
  if (blogSubscription) {
    blogSubscription.unsubscribe();
  }
});

// Generate blog ideas
const generateBlogIdeas = async () => {
  if (!selectedResearch.value) return;
  
  generating.value = true;
  try {
    const response = await axios.post('http://localhost:3000/api/blog-ideas/generate', {
      research_title: selectedResearch.value.title,
      research_text: selectedResearch.value.main_text,
      user_id: user.value.id,
      research_id: selectedResearch.value.id
    });
    
    // Show success message
    blogIdeas.value = `Successfully generated ${response.data.count} blog ideas!`;
    // Fetch updated blogs
    fetchBlogs();
  } catch (error) {
    console.error('Error generating blog ideas:', error);
    blogIdeas.value = 'Error generating blog ideas. Please try again.';
  } finally {
    generating.value = false;
  }
};

// Function to fetch user prompt
const fetchUserPrompt = async () => {
  if (!user.value) return;
  
  promptLoading.value = true;
  try {
    const response = await axios.get('http://localhost:3000/api/blog-ideas/prompts', {
      params: {
        user_profile_id: user.value.id
      }
    });
    console.log('Prompt response:', response.data);
    if (response.data && response.data.blog_prompt) {
      userPrompt.value = response.data.blog_prompt;
    } else {
      userPrompt.value = '';
    }
  } catch (error) {
    console.error('Error fetching user prompt:', error);
    userPrompt.value = '';
  } finally {
    promptLoading.value = false;
  }
};

// Function to update user prompt
const updateUserPrompt = async () => {
  if (!user.value) return;
  
  try {
    await axios.put('http://localhost:3000/api/blog-ideas/prompts', {
      blog_prompt: userPrompt.value,
      user_profile_id: user.value.id
    });
    showPromptLightbox.value = false;
  } catch (error) {
    console.error('Error updating user prompt:', error);
  }
};

onMounted(() => {
  if (user.value) {
    fetchResearch();
  }
});
</script>

<style scoped>
.research {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  color: #333;
}

.research-selector {
  margin-bottom: 2rem;
}

.research-dropdown {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
  cursor: pointer;
}

.research-dropdown:focus {
  outline: none;
  border-color: #007bff;
}

.research-form {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
}

.submit-button {
  padding: 0.75rem 1.5rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.submit-button:hover {
  background-color: #218838;
}

.research-content {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.content-display {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.6;
  color: #333;
  cursor: pointer;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.content-display:hover {
  background: #e9ecef;
}

.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.lightbox-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.lightbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.lightbox-header h3 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
}

.close-button:hover {
  color: #333;
}

.lightbox-body {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #333;
}

@media (max-width: 768px) {
  .research {
    padding: 1rem;
  }

  .lightbox-content {
    width: 95%;
    padding: 1rem;
  }
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-size: 1.1rem;
}

.blog-ideas-section {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.blog-ideas-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.prompt-button {
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.generate-button {
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.generate-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.blog-ideas-list {
  margin-top: 1rem;
}

.blog-idea-item {
  margin-bottom: 1rem;
}

.blog-idea-content {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.blog-concept-input {
  flex: 1;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  background-color: white;
}

.delete-button {
  padding: 0.5rem;
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-button:hover {
  background-color: #f8d7da;
  color: #c82333;
}

.blog-ideas-results {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  white-space: pre-wrap;
}

.prompt-textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  margin-bottom: 1rem;
  font-family: inherit;
}

.prompt-textarea:focus {
  outline: none;
  border-color: #4CAF50;
}
</style> 