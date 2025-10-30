import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:nourish_link/role_based_home.dart';
import 'services/firebase_service.dart';
import 'services/auth_service.dart';
import 'screens/auth_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nourish Link',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF228B22)),
        useMaterial3: true,
      ),
      home: const InitializationWrapper(),
    );
  }
}

class InitializationWrapper extends StatelessWidget {
  const InitializationWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: FirebaseService.initializeFirebase(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Color(0xFFDAA520)),
                  SizedBox(height: 20),
                  Text(
                    "Connecting to Nourish Link Services...",
                    style: TextStyle(fontSize: 16),
                  ),
                ],
              ),
            ),
          );
        }

        if (snapshot.connectionState == ConnectionState.done) {
          if (snapshot.hasError) {
            return Scaffold(
              appBar: AppBar(
                title: const Text("Connection Failed"),
                backgroundColor: Colors.red,
              ),
              body: Center(
                child: Text(
                  "FATAL ERROR: ${snapshot.error}",
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return const AuthStatusChecker();
        }

        return const Center(child: Text("Initializing..."));
      },
    );
  }
}

class AuthStatusChecker extends StatelessWidget {
  const AuthStatusChecker({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: AuthService().userChanges,
      builder: (context, userSnapshot) {
        if (userSnapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: Color(0xFF228B22)),
            ),
          );
        }

        if (userSnapshot.hasData && userSnapshot.data != null) {
          return const RoleBasedHome();
        }

        return const AuthScreen();
      },
    );
  }
}
