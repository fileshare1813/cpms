const Project = require('../models/Project');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');

// GET /api/projects - Get all projects
const getAllProjects = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      client = '',
      serviceType = '',
      priority = ''
    } = req.query;

    console.log('🔄 Getting all projects with params:', { page, limit, search, status, client });

    // Build filter object
    let filter = {};
    
    // Role-based filtering
    if (req.user.role === 'client' && req.user.clientId) {
      filter.client = req.user.clientId;
    } else if (req.user.role === 'employee') {
      filter['assignedEmployees.employee'] = req.user.employeeId;
    }
    // Admin can see all projects
    
    // Additional filters
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) filter.status = status;
    if (client && mongoose.Types.ObjectId.isValid(client)) filter.client = client;
    if (serviceType) filter.serviceType = serviceType;
    if (priority) filter.priority = priority;

    const projects = await Project.find(filter)
      .populate('client', 'companyName clientId contactPerson email')
      .populate('assignedEmployees.employee', 'name designation department email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(filter);

    console.log('✅ Successfully fetched projects:', projects.length);

    res.json({
      success: true,
      projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Get all projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
};

// GET /api/projects/:id - Get project by ID
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    const project = await Project.findById(id)
      .populate('client', 'companyName clientId contactPerson email phone')
      .populate('assignedEmployees.employee', 'name designation department email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const canView = req.user.role === 'admin' || 
                   (req.user.role === 'client' && project.client._id.toString() === req.user.clientId.toString()) ||
                   (req.user.role === 'employee' && project.assignedEmployees.some(emp => emp.employee._id.toString() === req.user.employeeId.toString()));

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this project'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('❌ Get project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
};

// POST /api/projects - Create new project
const createProject = async (req, res) => {
  try {
    const projectData = req.body;
    console.log('🔄 Creating new project:', projectData);

    // Validation
    const requiredFields = ['projectName', 'client', 'serviceType', 'description', 'budget', 'startDate', 'estimatedEndDate'];
    const missingFields = requiredFields.filter(field => !projectData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate client exists
    if (!mongoose.Types.ObjectId.isValid(projectData.client)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID format'
      });
    }

    const client = await Client.findById(projectData.client);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Validate dates
    const startDate = new Date(projectData.startDate);
    const endDate = new Date(projectData.estimatedEndDate);
    
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Validate assigned employees if provided
    if (projectData.assignedEmployees && projectData.assignedEmployees.length > 0) {
      for (const assignment of projectData.assignedEmployees) {
        if (!mongoose.Types.ObjectId.isValid(assignment.employee)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid employee ID format'
          });
        }
        
        const employee = await Employee.findById(assignment.employee);
        if (!employee) {
          return res.status(404).json({
            success: false,
            message: `Employee not found: ${assignment.employee}`
          });
        }
      }
    }

    // Create project
    const project = new Project({
      ...projectData,
      projectName: projectData.projectName.trim(),
      description: projectData.description.trim(),
      budget: Number(projectData.budget),
      startDate: startDate,
      estimatedEndDate: endDate,
      status: projectData.status || 'planning',
      priority: projectData.priority || 'medium',
      progress: projectData.progress || 0,
      assignedEmployees: projectData.assignedEmployees || [],
      milestones: projectData.milestones || [],
      requirements: projectData.requirements || [],
      technologies: projectData.technologies || [],
      notes: projectData.notes?.trim() || ''
    });

    const savedProject = await project.save();
    
    // Populate the saved project
    const populatedProject = await Project.findById(savedProject._id)
      .populate('client', 'companyName clientId contactPerson email')
      .populate('assignedEmployees.employee', 'name designation department email');

    console.log('✅ Project created successfully with ID:', savedProject.projectId);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('❌ Create project error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
};

// PUT /api/projects/:id - Update project
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🔄 Updating project with ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Validate dates if provided
    if (updateData.startDate && updateData.estimatedEndDate) {
      const startDate = new Date(updateData.startDate);
      const endDate = new Date(updateData.estimatedEndDate);
      
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Validate client if provided
    if (updateData.client && !mongoose.Types.ObjectId.isValid(updateData.client)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID format'
      });
    }

    // Prepare update data
    const sanitizedUpdateData = { ...updateData };
    if (updateData.projectName) sanitizedUpdateData.projectName = updateData.projectName.trim();
    if (updateData.description) sanitizedUpdateData.description = updateData.description.trim();
    if (updateData.budget) sanitizedUpdateData.budget = Number(updateData.budget);
    if (updateData.notes) sanitizedUpdateData.notes = updateData.notes.trim();

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      { new: true, runValidators: true }
    )
    .populate('client', 'companyName clientId contactPerson email')
    .populate('assignedEmployees.employee', 'name designation department email');

    console.log('✅ Project updated successfully');

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('❌ Update project error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
};

// DELETE /api/projects/:id - Delete project
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if project can be deleted (only if not in progress)
    if (project.status === 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete project that is in progress'
      });
    }

    await Project.findByIdAndDelete(id);
    console.log('✅ Project deleted successfully');

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
};

// GET /api/projects/client/:clientId - Get projects by client
const getProjectsByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID format'
      });
    }

    const projects = await Project.find({ client: clientId })
      .populate('client', 'companyName clientId')
      .populate('assignedEmployees.employee', 'name designation')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('❌ Get projects by client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client projects',
      error: error.message
    });
  }
};

// GET /api/projects/stats - Get project statistics
const getProjectStats = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: 'in-progress' });
    const completedProjects = await Project.countDocuments({ status: 'completed' });
    const delayedProjects = await Project.countDocuments({ status: 'delayed' });

    // Service type distribution
    const serviceTypeStats = await Project.aggregate([
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        delayed: delayedProjects,
        serviceTypes: serviceTypeStats
      }
    });
  } catch (error) {
    console.error('❌ Get project stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectsByClient,
  getProjectStats
};
