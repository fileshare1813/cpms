const Employee = require('../models/Employee');
const User = require('../models/User');

// GET /api/employees
const getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', department = '', status = '' } = req.query;

    console.log('🔄 Getting all employees with params:', { page, limit, search, department, status });

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) filter.department = department;
    if (status) filter.status = status;

    // Get employees with pagination
    const employees = await Employee.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Check if each employee has login account
    const employeesWithAccountStatus = await Promise.all(
      employees.map(async (employee) => {
        try {
          const hasLoginAccount = await User.exists({ 
            role: 'employee', 
            employeeId: employee._id 
          });
          return {
            ...employee.toObject(),
            hasLoginAccount: !!hasLoginAccount
          };
        } catch (error) {
          console.error(`Error checking login account for employee ${employee._id}:`, error);
          return {
            ...employee.toObject(),
            hasLoginAccount: false
          };
        }
      })
    );

    const total = await Employee.countDocuments(filter);

    console.log('✅ Successfully fetched employees:', employeesWithAccountStatus.length);

    res.json({
      success: true,
      employees: employeesWithAccountStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Get all employees error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch employees', 
      error: error.message 
    });
  }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Check if employee has login account
    const hasLoginAccount = await User.exists({ 
      role: 'employee', 
      employeeId: employee._id 
    });

    res.json({
      success: true,
      employee: {
        ...employee.toObject(),
        hasLoginAccount: !!hasLoginAccount
      }
    });
  } catch (error) {
    console.error('❌ Get employee by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch employee', 
      error: error.message 
    });
  }
};

// POST /api/employees - FIXED VERSION
const createEmployee = async (req, res) => {
  try {
    const employeeData = req.body;
    console.log('🔄 Creating new employee:', employeeData);

    // Validation
    const requiredFields = ['name', 'email', 'phone', 'designation', 'department', 'joiningDate'];
    const missingFields = requiredFields.filter(field => !employeeData[field] || 
      (typeof employeeData[field] === 'string' && employeeData[field].trim() === '')
    );
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(employeeData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if employee with same email already exists
    const existingEmployee = await Employee.findOne({ 
      email: employeeData.email.toLowerCase() 
    });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this email already exists'
      });
    }

    // Prepare employee data - DON'T include employeeId, let middleware generate it
    const preparedEmployeeData = {
      name: employeeData.name.trim(),
      email: employeeData.email.toLowerCase().trim(),
      phone: employeeData.phone.trim(),
      designation: employeeData.designation.trim(),
      department: employeeData.department,
      joiningDate: new Date(employeeData.joiningDate),
      salary: employeeData.salary || 0,
      skills: Array.isArray(employeeData.skills) ? employeeData.skills : 
              typeof employeeData.skills === 'string' ? 
              employeeData.skills.split(',').map(s => s.trim()).filter(s => s) : [],
      status: employeeData.status || 'active',
      address: employeeData.address?.trim() || '',
      emergencyContact: employeeData.emergencyContact || {}
    };

    console.log('📤 Prepared employee data (without employeeId):', preparedEmployeeData);

    // Create new employee instance - employeeId will be auto-generated by pre-save middleware
    const employee = new Employee(preparedEmployeeData);
    
    console.log('🔄 Saving employee to database...');
    
    // Save employee - this will trigger pre-save middleware to generate employeeId
    const savedEmployee = await employee.save();
    
    console.log('✅ Employee created successfully with ID:', savedEmployee.employeeId);

    res.status(201).json({ 
      success: true,
      message: 'Employee created successfully', 
      employee: savedEmployee
    });
  } catch (error) {
    console.error('❌ Create employee error:', error);
    
    // Handle specific mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: validationErrors,
        error: error.message 
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        message: `Employee with this ${field} already exists`,
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create employee', 
      error: error.message 
    });
  }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('🔄 Updating employee with ID:', id, 'Data:', updateData);

    // Find existing employee
    const existingEmployee = await Employee.findById(id);
    if (!existingEmployee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Check if email is being changed and if new email already exists
    if (updateData.email && updateData.email.toLowerCase() !== existingEmployee.email) {
      const emailExists = await Employee.findOne({ 
        email: updateData.email.toLowerCase(), 
        _id: { $ne: id } 
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Employee with this email already exists'
        });
      }
    }

    // Prepare update data
    const sanitizedUpdateData = {};
    if (updateData.name) sanitizedUpdateData.name = updateData.name.trim();
    if (updateData.email) sanitizedUpdateData.email = updateData.email.toLowerCase().trim();
    if (updateData.phone) sanitizedUpdateData.phone = updateData.phone.trim();
    if (updateData.designation) sanitizedUpdateData.designation = updateData.designation.trim();
    if (updateData.department) sanitizedUpdateData.department = updateData.department;
    if (updateData.joiningDate) sanitizedUpdateData.joiningDate = new Date(updateData.joiningDate);
    if (updateData.salary !== undefined) sanitizedUpdateData.salary = updateData.salary;
    if (updateData.status) sanitizedUpdateData.status = updateData.status;
    if (updateData.address !== undefined) sanitizedUpdateData.address = updateData.address.trim();
    if (updateData.skills) {
      sanitizedUpdateData.skills = Array.isArray(updateData.skills) ? updateData.skills : 
                                   typeof updateData.skills === 'string' ? 
                                   updateData.skills.split(',').map(s => s.trim()).filter(s => s) : [];
    }

    // Update employee
    const employee = await Employee.findByIdAndUpdate(
      id,
      sanitizedUpdateData,
      { 
        new: true, 
        runValidators: true
      }
    );

    console.log('✅ Employee updated successfully');

    res.json({ 
      success: true,
      message: 'Employee updated successfully', 
      employee 
    });
  } catch (error) {
    console.error('❌ Update employee error:', error);
    
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
      message: 'Failed to update employee', 
      error: error.message 
    });
  }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔄 Deleting employee with ID:', id);

    // Find employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employee not found' 
      });
    }

    // Delete associated user account if exists
    await User.findOneAndDelete({ employeeId: employee._id });
    console.log('✅ Associated user account deleted');

    // Delete employee
    await Employee.findByIdAndDelete(id);
    console.log('✅ Employee deleted successfully');

    res.json({ 
      success: true,
      message: 'Employee deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete employee error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete employee', 
      error: error.message 
    });
  }
};

// Get Employee Statistics
const getEmployeeStats = async (req, res) => {
  try {
    console.log('🔄 Getting employee statistics');

    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'active' });
    const inactiveEmployees = await Employee.countDocuments({ status: 'inactive' });
    const onLeaveEmployees = await Employee.countDocuments({ status: 'on-leave' });

    // Department wise count
    const departmentStats = await Employee.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('✅ Successfully fetched employee statistics');

    res.json({
      success: true,
      stats: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        onLeave: onLeaveEmployees,
        departments: departmentStats
      }
    });
  } catch (error) {
    console.error('❌ Get employee stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch employee statistics', 
      error: error.message 
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats
};
