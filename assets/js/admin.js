document.addEventListener('DOMContentLoaded', async () => {
  const loginSection = document.getElementById('login-section');
  const adminSection = document.getElementById('admin-section');
  const loginForm = document.getElementById('login-form');
  const addProjectForm = document.getElementById('add-project-form');
  const projectsContainer = document.getElementById('projects-container');
  const logoutBtn = document.getElementById('logout-btn');
  const uploadStatus = document.getElementById('upload-status');
  
  // UI Elements for Edit Mode
  const formTitle = document.getElementById('form-title');
  const submitBtn = document.getElementById('submit-project-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const imageEditHint = document.getElementById('image-edit-hint');

  // State
  let allProjects = [];
  let editingProjectId = null;
  let editingProjectImage = null;
  let editingProjectBeforeImage = null;

  // Check if user is already logged in
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showAdminPanel();
  }

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');
    errorMsg.textContent = '';

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      errorMsg.textContent = "Erreur: " + error.message;
    } else {
      showAdminPanel();
    }
  });

  // Handle Logout
  logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    loginSection.classList.remove('admin-hidden');
    adminSection.classList.add('admin-hidden');
  });

  function showAdminPanel() {
    loginSection.classList.add('admin-hidden');
    adminSection.classList.remove('admin-hidden');
    loadProjects();
  }

  function resetForm() {
    addProjectForm.reset();
    editingProjectId = null;
    editingProjectImage = null;
    editingProjectBeforeImage = null;
    formTitle.textContent = "Ajouter un nouveau projet";
    submitBtn.textContent = "Publier le projet";
    cancelEditBtn.style.display = "none";
    imageEditHint.style.display = "none";
    uploadStatus.textContent = "";
    isBeforeAfterCheckbox.dispatchEvent(new Event('change'));
  }

  cancelEditBtn.addEventListener('click', resetForm);

  // Handle UI changes for before/after checkbox
  const isBeforeAfterCheckbox = document.getElementById('project-is-before-after');
  const beforeImageGroup = document.getElementById('before-image-group');
  const beforeImageInput = document.getElementById('project-image-before');
  const mainImageLabel = document.getElementById('main-image-label');

  isBeforeAfterCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      beforeImageGroup.style.display = 'block';
      // Required only if not editing OR if editing but no before image exists yet
      beforeImageInput.required = !editingProjectId || !editingProjectBeforeImage;
      mainImageLabel.textContent = 'Photo "Après" (Résultat)';
    } else {
      beforeImageGroup.style.display = 'none';
      beforeImageInput.required = false;
      mainImageLabel.textContent = 'Photo du projet';
    }
  });

  // Handle Project Submission (Create & Update)
  addProjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadStatus.textContent = "Sauvegarde en cours...";
    uploadStatus.style.color = "blue";
    submitBtn.disabled = true;

    const title = document.getElementById('project-title').value;
    const tag = document.getElementById('project-tag').value;
    const desc = document.getElementById('project-desc').value;
    const fileInput = document.getElementById('project-image');
    const file = fileInput.files[0];
    
    const isBeforeAfter = isBeforeAfterCheckbox.checked;
    const beforeFile = beforeImageInput.files[0];

    // Basic validation
    if (!editingProjectId && (!file || (isBeforeAfter && !beforeFile))) {
      uploadStatus.textContent = "Veuillez sélectionner les images nécessaires.";
      uploadStatus.style.color = "red";
      submitBtn.disabled = false;
      return;
    }

    try {
      let publicUrl = editingProjectImage;
      
      // 1. Upload Main Image to Storage (if new)
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('project-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl: newUrl } } = supabaseClient.storage
          .from('project-images')
          .getPublicUrl(filePath);
          
        publicUrl = newUrl;
      }

      let publicBeforeUrl = editingProjectBeforeImage;
      
      // 2. Upload Before Image (if new)
      if (isBeforeAfter && beforeFile) {
        uploadStatus.textContent = "Téléchargement de l'image Avant...";
        const beforeFileExt = beforeFile.name.split('.').pop();
        const beforeFileName = `before_${Math.random()}.${beforeFileExt}`;
        const beforeFilePath = `${beforeFileName}`;
        
        const { error: uploadBeforeError } = await supabaseClient.storage
          .from('project-images')
          .upload(beforeFilePath, beforeFile);

        if (uploadBeforeError) throw uploadBeforeError;

        const { data: beforeData } = supabaseClient.storage
          .from('project-images')
          .getPublicUrl(beforeFilePath);
          
        publicBeforeUrl = beforeData.publicUrl;
      } else if (!isBeforeAfter) {
        publicBeforeUrl = null;
      }

      // 3. Upsert into Database
      uploadStatus.textContent = "Enregistrement dans la base de données...";
      
      const payload = { 
        title: title, 
        tag: tag, 
        description: desc, 
        image_url: publicUrl,
        is_before_after: isBeforeAfter,
        image_before_url: publicBeforeUrl
      };

      if (editingProjectId) {
        // UPDATE
        const { error: dbError } = await supabaseClient
          .from('projects')
          .update(payload)
          .eq('id', editingProjectId);
        if (dbError) throw dbError;
        uploadStatus.textContent = "Projet mis à jour avec succès !";
      } else {
        // INSERT
        const { error: dbError } = await supabaseClient
          .from('projects')
          .insert([payload]);
        if (dbError) throw dbError;
        uploadStatus.textContent = "Projet publié avec succès !";
      }

      uploadStatus.style.color = "green";
      resetForm();
      loadProjects();

    } catch (error) {
      console.error(error);
      uploadStatus.textContent = "Erreur: " + error.message;
      uploadStatus.style.color = "red";
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Load Projects from DB
  async function loadProjects() {
    projectsContainer.innerHTML = "<p>Chargement...</p>";
    const { data, error } = await supabaseClient
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      projectsContainer.innerHTML = "<p style='color:red;'>Erreur lors du chargement des projets.</p>";
      return;
    }

    allProjects = data || [];

    if (allProjects.length === 0) {
      projectsContainer.innerHTML = "<p>Aucun projet publié pour le moment.</p>";
      return;
    }

    projectsContainer.innerHTML = "";
    allProjects.forEach(project => {
      const item = document.createElement('div');
      item.className = 'project-item';
      
      let badge = '';
      if (project.is_before_after) {
        badge = '<span style="background:var(--brand); color:white; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:10px;">Avant/Après</span>';
      }
      
      const starColor = project.is_featured ? '#f39c12' : '#ccc';
      const starText = project.is_featured ? 'En vedette (Accueil)' : 'Mettre en vedette';

      item.innerHTML = `
        <img src="${project.image_url}" alt="${project.title}">
        <div class="project-item-info">
          <h4>${project.title} <span style="font-size:0.8em; font-weight:normal; color:#888;">(${project.tag})</span> ${badge}</h4>
          <p>${project.description}</p>
        </div>
        <div style="display:flex; flex-direction: column; gap: 8px; min-width: 150px;">
          <button class="btn" style="background:${starColor}; color:white; padding: 5px 10px; font-size: 0.85em;" onclick="toggleFeatured('${project.id}', ${project.is_featured})">★ ${starText}</button>
          <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.85em;" onclick="editProject('${project.id}')">Modifier</button>
          <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.85em;" onclick="deleteProject('${project.id}', '${project.image_url}', '${project.image_before_url || ''}')">Supprimer</button>
        </div>
      `;
      projectsContainer.appendChild(item);
    });
  }

  // Edit Project function
  window.editProject = function(id) {
    const p = allProjects.find(x => x.id === id);
    if(!p) return;
    
    editingProjectId = p.id;
    editingProjectImage = p.image_url;
    editingProjectBeforeImage = p.image_before_url;

    document.getElementById('project-title').value = p.title;
    document.getElementById('project-tag').value = p.tag;
    document.getElementById('project-desc').value = p.description;
    
    isBeforeAfterCheckbox.checked = p.is_before_after;
    isBeforeAfterCheckbox.dispatchEvent(new Event('change'));
    
    // Disable required for files during edit since they are optional
    document.getElementById('project-image').required = false;
    if (beforeImageInput) beforeImageInput.required = false;

    formTitle.textContent = "Modifier le projet";
    submitBtn.textContent = "Mettre à jour le projet";
    cancelEditBtn.style.display = "inline-block";
    imageEditHint.style.display = "block";
    uploadStatus.textContent = "";

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle Featured Project function
  window.toggleFeatured = async function(id, currentStatus) {
    try {
      const { error } = await supabaseClient
        .from('projects')
        .update({ is_featured: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      loadProjects();
    } catch(err) {
      alert("Erreur lors de la mise en avant : " + err.message);
    }
  };

  // Delete Project function
  window.deleteProject = async function (id, imageUrl, imageBeforeUrl) {
    if (!confirm("Voulez-vous vraiment supprimer ce projet ?")) return;

    try {
      // Delete from DB
      const { error: dbError } = await supabaseClient
        .from('projects')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Extract filename from URL to delete from storage
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      let filesToDelete = [fileName];
      
      if (imageBeforeUrl && imageBeforeUrl !== 'null') {
        const beforeUrlParts = imageBeforeUrl.split('/');
        const beforeFileName = beforeUrlParts[beforeUrlParts.length - 1];
        filesToDelete.push(beforeFileName);
      }

      const { error: storageError } = await supabaseClient.storage
        .from('project-images')
        .remove(filesToDelete);

      if (storageError) console.error("Erreur suppression image:", storageError);

      loadProjects();
    } catch (error) {
      alert("Erreur lors de la suppression : " + error.message);
    }
  };
});
