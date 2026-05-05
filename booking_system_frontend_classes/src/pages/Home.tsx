import { Link } from 'react-router-dom';
import { Button } from '../components/common';
import { Rocket, Globe, Shield, Zap, Star, Sparkles, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export const Home = () => {
  const features = [
    {
      icon: <Rocket size={32} />,
      title: 'Interplanetary Travel',
      description: 'Explore destinations across the solar system with our state-of-the-art spacecraft.',
    },
    {
      icon: <Globe size={32} />,
      title: 'Multiple Destinations',
      description: 'From Mars to Europa, discover new worlds and book your journey today.',
    },
    {
      icon: <Shield size={32} />,
      title: 'Safe & Secure',
      description: 'Your safety is our priority with advanced navigation and life support systems.',
    },
    {
      icon: <Zap size={32} />,
      title: 'Instant Booking',
      description: 'Book your flight in seconds and receive instant confirmation.',
    },
  ];

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center py-20"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-cosmic-gradient bg-clip-text text-transparent">
              Journey Beyond
            </span>
            <br />
            <span className="text-star-white">The Stars</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-star-white/80 mb-8 max-w-2xl mx-auto"
        >
          Experience the future of space travel with Galaxium. Book your
          interplanetary flight and explore the wonders of our solar system.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link to="/flights">
            <Button size="lg" className="w-full sm:w-auto">
              Explore Flights
            </Button>
          </Link>
          <Button variant="secondary" size="lg" className="w-full sm:w-auto">
            Learn More
          </Button>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-12 text-star-white"
        >
          Why Choose Galaxium?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 text-center hover:bg-white/10 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cosmic-gradient mb-4">
                <div className="text-white">{feature.icon}</div>
              </div>
              <h3 className="text-xl font-semibold text-star-white mb-2">
                {feature.title}
              </h3>
              <p className="text-star-white/70">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Flight Classes Section */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-4 text-star-white"
        >
          Choose Your Travel Experience
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-star-white/70 mb-12 max-w-2xl mx-auto"
        >
          Select from our three distinct classes, each designed to provide a unique journey through the cosmos
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Economy Class */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
            className="glass-card p-8 hover:bg-white/10 transition-all duration-300"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4 mx-auto">
              <Star className="text-blue-400" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-star-white mb-2 text-center">
              Economy Class
            </h3>
            <p className="text-star-white/60 text-center mb-4">Base Price</p>
            <ul className="space-y-3 text-star-white/80">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">✓</span>
                <span>Standard seating with cosmic views</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">✓</span>
                <span>Entry-level space travel experience</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">✓</span>
                <span>Access to onboard entertainment</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">✓</span>
                <span>Complimentary space meals</span>
              </li>
            </ul>
          </motion.div>

          {/* Business Class */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 hover:bg-white/10 transition-all duration-300 border-2 border-purple-500/30"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4 mx-auto">
              <Sparkles className="text-purple-400" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-star-white mb-2 text-center">
              Business Class
            </h3>
            <p className="text-star-white/60 text-center mb-4">1.5x Base Price</p>
            <ul className="space-y-3 text-star-white/80">
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">✓</span>
                <span>Enhanced comfort with reclining seats</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">✓</span>
                <span>Priority boarding and departure</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">✓</span>
                <span>Premium dining experience</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">✓</span>
                <span>Extra luggage allowance</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">✓</span>
                <span>Access to business lounge</span>
              </li>
            </ul>
          </motion.div>

          {/* Galaxium Class */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 hover:bg-white/10 transition-all duration-300 border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-purple-500/5"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 mb-4 mx-auto">
              <Crown className="text-yellow-400" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-star-white mb-2 text-center">
              Galaxium Class
            </h3>
            <p className="text-star-white/60 text-center mb-4">2.5x Base Price</p>
            <ul className="space-y-3 text-star-white/80">
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">✓</span>
                <span>Luxury private pods with panoramic views</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">✓</span>
                <span>Exclusive VIP boarding experience</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">✓</span>
                <span>Gourmet dining by stellar chefs</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">✓</span>
                <span>Personal concierge service</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">✓</span>
                <span>Premium amenities and gifts</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">✓</span>
                <span>Unlimited luggage allowance</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="glass-card p-12 text-center bg-cosmic-gradient"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready for Your Space Adventure?
        </h2>
        <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of space travelers who have already booked their
          journey to the stars. Your adventure awaits!
        </p>
        <Link to="/flights">
          <Button variant="secondary" size="lg">
            Book Your Flight Now
          </Button>
        </Link>
      </motion.section>
    </div>
  );
};

// Made with Bob
