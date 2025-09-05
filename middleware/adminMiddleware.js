module.exports = function (req, res, next) {
  console.log('Admin middleware - User object:', req.user);
  console.log('Admin middleware - User role:', req.user?.role);
  console.log('Admin middleware - User isAdmin:', req.user?.isAdmin);
  
  if (!req.user || !req.user.isAdmin) {
    console.log('Admin middleware - Access denied');
    return res.status(403).json({ msg: 'Admin resource, access denied' });
  }
  
  console.log('Admin middleware - Access granted');
  next();
};
