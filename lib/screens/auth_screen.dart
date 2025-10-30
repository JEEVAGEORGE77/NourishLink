import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen>
    with SingleTickerProviderStateMixin {
  final AuthService _authService = AuthService();
  final _formKey = GlobalKey<FormState>();

  bool _isLogin = true;
  bool _isLoading = false;
  String _email = '';
  String _password = '';
  String _confirmPassword = ''; // New state for confirmation
  String _name = '';
  String _selectedRole = 'Donor';

  final Color _primaryGreen = const Color(0xFF228B22);
  final Color _accentGold = const Color(0xFFDAA520);

  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _showErrorSnackbar(String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red.shade700,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<void> _submitAuthForm() async {
    final isValid = _formKey.currentState!.validate();
    FocusScope.of(context).unfocus();

    if (isValid) {
      _formKey.currentState!.save();
      setState(() {
        _isLoading = true;
      });

      try {
        if (_isLogin) {
          await _authService.signIn(email: _email, password: _password);
        } else {
          await _authService.signUp(
            email: _email,
            password: _password,
            name: _name,
            role: _selectedRole,
          );
        }
      } catch (e) {
        _showErrorSnackbar(e.toString().replaceFirst('Exception: ', ''));
      } finally {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _toggleAuthMode() {
    setState(() {
      _isLogin = !_isLogin;
      if (_isLogin) {
        _controller.reverse();
      } else {
        _controller.forward();
      }
    });
  }

  Widget _buildRoleSelector() {
    if (_isLogin) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'I am registering as:',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12.0),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _primaryGreen, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 5,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedRole,
              isExpanded: true,
              style: TextStyle(fontSize: 16, color: _primaryGreen),
              icon: Icon(Icons.arrow_drop_down, color: _primaryGreen),
              // Roles are limited to Donor and Volunteer for security
              items: <String>['Donor', 'Volunteer']
                  .map<DropdownMenuItem<String>>((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value),
                    );
                  })
                  .toList(),
              onChanged: (String? newValue) {
                setState(() {
                  _selectedRole = newValue!;
                });
              },
            ),
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildSubmitButton() {
    return ScaleTransition(
      scale: _animation,
      child: _isLoading
          ? Center(child: CircularProgressIndicator(color: _primaryGreen))
          : ElevatedButton(
              onPressed: _submitAuthForm,
              style: ElevatedButton.styleFrom(
                backgroundColor: _primaryGreen,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 55),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 5,
                shadowColor: _primaryGreen.withOpacity(0.5),
              ),
              child: Text(
                _isLogin ? 'LOGIN' : 'SIGN UP',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(30.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo/Header Area
              Image.asset('assets/logo.png', height: 120),
              const SizedBox(height: 10),
              Text(
                _isLogin ? 'Welcome Back!' : 'Join the Link!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: _primaryGreen,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                _isLogin
                    ? 'Sign in to Connect. Collect. Care.'
                    : 'Register to start making an impact.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              ),
              const SizedBox(height: 40),

              // Authentication Form
              Card(
                elevation: 10,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(25.0),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        // Name Field (Registration only)
                        if (!_isLogin)
                          TextFormField(
                            key: const ValueKey('name'),
                            keyboardType: TextInputType.name,
                            decoration: InputDecoration(
                              labelText: 'Your Organization/Name',
                              prefixIcon: Icon(
                                Icons.person,
                                color: _accentGold,
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter a name.';
                              }
                              return null;
                            },
                            onSaved: (value) {
                              _name = value!;
                            },
                          ),
                        if (!_isLogin) const SizedBox(height: 15),

                        // Email Field
                        TextFormField(
                          key: const ValueKey('email'),
                          keyboardType: TextInputType.emailAddress,
                          decoration: InputDecoration(
                            labelText: 'Email Address',
                            prefixIcon: Icon(Icons.email, color: _accentGold),
                          ),
                          validator: (value) {
                            if (value == null || !value.contains('@')) {
                              return 'Please enter a valid email address.';
                            }
                            return null;
                          },
                          onSaved: (value) {
                            _email = value!;
                          },
                        ),
                        const SizedBox(height: 15),

                        // Password Field
                        TextFormField(
                          key: const ValueKey('password'),
                          obscureText: true,
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: Icon(Icons.lock, color: _accentGold),
                          ),
                          validator: (value) {
                            _password =
                                value ??
                                ''; // Save password for confirmation check
                            if (value == null || value.length < 7) {
                              return 'Password must be at least 7 characters long.';
                            }
                            return null;
                          },
                          onSaved: (value) {
                            _password = value!;
                          },
                        ),
                        const SizedBox(height: 15),

                        // Confirm Password Field (Registration only)
                        if (!_isLogin)
                          TextFormField(
                            key: const ValueKey('confirm_password'),
                            obscureText: true,
                            decoration: InputDecoration(
                              labelText: 'Confirm Password',
                              prefixIcon: Icon(
                                Icons.lock_reset,
                                color: _accentGold,
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please confirm your password.';
                              }
                              if (value != _password) {
                                return 'Passwords do not match.';
                              }
                              return null;
                            },
                            onSaved: (value) {
                              _confirmPassword = value!;
                            },
                          ),
                        if (!_isLogin) const SizedBox(height: 25),

                        // Role Selector (Registration only)
                        _buildRoleSelector(),

                        // Submit Button
                        _buildSubmitButton(),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 25),

              // Switch Mode Button
              TextButton(
                onPressed: _toggleAuthMode,
                style: TextButton.styleFrom(
                  foregroundColor: _primaryGreen,
                  padding: const EdgeInsets.all(15),
                ),
                child: Text(
                  _isLogin
                      ? 'Need an account? Sign Up'
                      : 'Already have an account? Login',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
