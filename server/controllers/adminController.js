import User from '../models/User.js';

/** Admin: list all users (no passwords) */
export async function getUsers(_req, res, next) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/** Admin: delete user by id */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}
