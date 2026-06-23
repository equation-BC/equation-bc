document.addEventListener('DOMContentLoaded', async () => {
  const loginSection = document.getElementById('login-section');
  const adminSection = document.getElementById('admin-section');
  const loginForm = document.getElementById('login-form');
  const addProjectForm = document.getElementById('add-project-form');
  const projectsContainer = document.getElementById('projects-container');
  const logoutBtn = document.getElementById('logout-btn');
  const uploadStatus = document.getElementById('upload-status');

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

  // Handle UI changes for before/after checkbox
  const isBeforeAfterCheckbox = document.getElementById('project-is-before-after');
  const beforeImageGroup = document.getElementById('before-image-group');
  const beforeImageInput = document.getElementById('project-image-before');
  const mainImageLabel = document.getElementById('main-image-label');

  isBeforeAfterCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      beforeImageGroup.style.display = 'block';
      beforeImageInput.required = true;
      mainImageLabel.textContent = 'Photo "Après" (Résultat)';
    } else {
      beforeImageGroup.style.display = 'none';
      beforeImageInput.required = false;
      mainImageLabel.textContent = 'Photo du projet';
    }
  });

  // Handle Project Submission
  addProjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadStatus.textContent = "Téléchargement de l'image en cours...";
    uploadStatus.style.color = "blue";
    document.getElementById('submit-project-btn').disabled = true;

    const title = document.getElementById('project-title').value;
    const tag = document.getElementById('project-tag').value;
    const desc = document.getElementById('project-desc').value;
    const fileInput = document.getElementById('project-image');
    const file = fileInput.files[0];
    
    const isBeforeAfter = isBeforeAfterCheckbox.checked;
    const beforeFile = beforeImageInput.files[0];

    if (!file || (isBeforeAfter && !beforeFile)) {
      uploadStatus.textContent = "Veuillez sélectionner les images nécessaires.";
      uploadStatus.style.color = "red";
      document.getElementById('submit-project-btn').disabled = false;
      return;
    }

    try {
      // 1. Upload Main Image to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('project-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL for main image
      const { data: { publicUrl } } = supabaseClient.storage
        .from('project-images')
        .getPublicUrl(filePath);
        
      let publicBeforeUrl = null;
      
      // 3. Upload Before Image if needed
      if (isBeforeAfter) {
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
      }

      // 4. Insert into Database
      uploadStatus.textContent = "Sauvegarde du projet...";
      const { error: dbError } = await supabaseClient
        .from('projects')
        .insert([
          { 
            title: title, 
            tag: tag, 
            description: desc, 
            image_url: publicUrl,
            is_before_after: isBeforeAfter,
            image_before_url: publicBeforeUrl
          }
        ]);

      if (dbError) throw dbError;

      uploadStatus.textContent = "Projet publié avec succès !";
      uploadStatus.style.color = "green";
      addProjectForm.reset();
      isBeforeAfterCheckbox.dispatchEvent(new Event('change')); // reset UI
      loadProjects();

    } catch (error) {
      console.error(error);
      uploadStatus.textContent = "Erreur: " + error.message;
      uploadStatus.style.color = "red";
    } finally {
      document.getElementById('submit-project-btn').disabled = false;
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

    if (data.length === 0) {
      projectsContainer.innerHTML = "<p>Aucun projet publié pour le moment.</p>";
      return;
    }

    projectsContainer.innerHTML = "";
    data.forEach(project => {
      const item = document.createElement('div');
      item.className = 'project-item';
      
      let badge = '';
      if (project.is_before_after) {
        badge = '<span style="background:var(--brand); color:white; padding:2px 6px; border-radius:4px; font-size:0.7em; margin-left:10px;">Avant/Après</span>';
      }
      
      item.innerHTML = `
        <img src="${project.image_url}" alt="${project.title}">
        <div class="project-item-info">
          <h4>${project.title} <span style="font-size:0.8em; font-weight:normal; color:#888;">(${project.tag})</span> ${badge}</h4>
          <p>${project.description}</p>
        </div>
        <button class="btn btn-danger" onclick="deleteProject('${project.id}', '${project.image_url}', '${project.image_before_url || ''}')">Supprimer</button>
      `;
      projectsContainer.appendChild(item);
    });
  }

  // Delete Project function (attached to window so onclick works)
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
