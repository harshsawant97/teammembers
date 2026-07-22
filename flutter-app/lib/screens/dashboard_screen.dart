import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Classes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => context.go('/'),
          )
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 3,
        itemBuilder: (context, index) {
          return Card(
            elevation: 2,
            margin: const EdgeInsets.only(bottom: 16),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: CircleAvatar(
                backgroundColor: Colors.blue.shade100,
                child: const Icon(Icons.class_, color: Colors.blue),
              ),
              title: Text('CS-${101 + index}: Subject Title', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text('Ongoing Session'),
              trailing: ElevatedButton(
                onPressed: () {
                  // Navigate to camera screen
                },
                child: const Text('Launch Camera'),
              ),
            ),
          );
        },
      ),
    );
  }
}
