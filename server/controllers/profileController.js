import Profile from '../models/Profile.js';
import { generateDeveloperProfile } from '../utils/aiService.js';

/**
 * Get current user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(200).json({ success: true, data: null });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * Sync profile with GitHub data and generate AI summary
 */
export const syncGithubProfile = async (req, res, next) => {
  try {
    const { githubUsername } = req.body;
    if (!githubUsername || !githubUsername.trim()) {
      return res.status(400).json({ message: 'GitHub username is required.' });
    }

    console.log(`[GitHub Sync] Fetching repositories for user: ${githubUsername}`);
    
    // Call public GitHub API to get repositories
    const githubRes = await fetch(`https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`);
    
    if (githubRes.status === 404) {
      return res.status(404).json({ message: `GitHub user "${githubUsername}" not found.` });
    }
    
    if (!githubRes.ok) {
      const gitErrText = await githubRes.text();
      console.error(`[GitHub Sync] GitHub API failed:`, gitErrText);
      return res.status(githubRes.status).json({ message: 'Failed to retrieve repositories from GitHub API.' });
    }

    const reposData = await githubRes.json();
    
    if (!Array.isArray(reposData)) {
      return res.status(500).json({ message: 'Unexpected response format from GitHub API.' });
    }

    // Clean and sort repositories by stargazers count desc
    const sortedRepos = reposData
      .map(r => ({
        name: r.name,
        description: r.description || '',
        language: r.language || 'Unknown',
        stars: r.stargazers_count || 0,
        repoUrl: r.html_url
      }))
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 15); // Top 15 repos for prompt summary

    console.log(`[GitHub Sync] Found ${sortedRepos.length} public repos. Summarizing with AI...`);

    // Generate AI Summary and Skills matrix
    const aiResult = await generateDeveloperProfile(githubUsername, sortedRepos);

    // Save or update Profile document in database
    let profile = await Profile.findOne({ userId: req.user.id });

    if (profile) {
      profile.githubUsername = githubUsername;
      profile.bio = aiResult.bio;
      profile.skills = aiResult.skills;
      profile.repositories = sortedRepos.map(r => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stars,
        repoUrl: r.repoUrl
      }));
      profile.lastSynced = new Date();
      await profile.save();
    } else {
      profile = await Profile.create({
        userId: req.user.id,
        githubUsername,
        bio: aiResult.bio,
        skills: aiResult.skills,
        repositories: sortedRepos,
        lastSynced: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'GitHub profile synchronized successfully.',
      data: profile
    });
  } catch (err) {
    next(err);
  }
};
