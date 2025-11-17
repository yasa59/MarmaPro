import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const quoteVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export default function Landing() {
  const ancientQuotes = [
    {
      text: "Marma points are the vital energy centers where consciousness, mind, and body meet.",
      author: "Sushruta Samhita",
      period: "Ancient Ayurvedic Text (600 BCE)",
    },
    {
      text: "The foot contains the map of the entire body. By treating the marma points, we heal the whole being.",
      author: "Charaka",
      period: "Father of Ayurveda",
    },
    {
      text: "Marma therapy awakens the body's innate healing intelligence, restoring balance and harmony.",
      author: "Vagbhata",
      period: "Ancient Ayurvedic Physician",
    },
  ];

  const marmaPoints = [
    {
      name: "Kshipra Marma",
      location: "Between first and second toe",
      benefit: "Enhances mental clarity and concentration",
    },
    {
      name: "Kurcha Marma",
      location: "Heel region",
      benefit: "Strengthens bones and improves stability",
    },
    {
      name: "Kurchashira Marma",
      location: "Achilles tendon area",
      benefit: "Boosts energy and vitality",
    },
    {
      name: "Gulpha Marma",
      location: "Ankle joint",
      benefit: "Improves flexibility and joint health",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl float" style={{ animationDelay: "4s" }} />
      </div>

      <motion.div
        className="relative z-10 container mx-auto px-6 py-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div
          className="text-center max-w-4xl mx-auto mb-20"
          variants={itemVariants}
        >
          <motion.h1
            className="text-5xl md:text-7xl font-extrabold mb-6 gradient-text"
            variants={itemVariants}
          >
            Ancient Wisdom Meets
            <br />
            <span className="text-white">Modern Technology</span>
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed"
            variants={itemVariants}
          >
            Experience the healing power of Marma Point Therapy through
            <br />
            <span className="text-blue-400 font-semibold">IoT-powered precision treatment</span>
          </motion.p>
          <motion.div
            className="flex flex-wrap justify-center gap-4"
            variants={itemVariants}
          >
            <Link
              to="/signup"
              className="btn btn-primary text-lg px-8 py-4 glow"
            >
              <span className="relative z-10">Begin Your Journey</span>
            </Link>
            <Link
              to="/login"
              className="btn btn-outline text-lg px-8 py-4"
            >
              <span className="relative z-10">Sign In</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Marma Points Introduction */}
        <motion.section
          className="mb-20"
          variants={itemVariants}
        >
          <div className="glass-strong rounded-3xl p-8 md:p-12">
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-4 gradient-text text-center"
              variants={itemVariants}
            >
              Understanding Marma Points
            </motion.h2>
            <motion.p
              className="text-lg text-slate-300 leading-relaxed mb-8 text-center max-w-3xl mx-auto"
              variants={itemVariants}
            >
              Marma points are vital energy centers in the body, identified in ancient Ayurvedic texts over 5,000 years ago.
              These sacred points are where consciousness, mind, and body converge. By applying precise pressure and
              stimulation to these points, we can activate the body's natural healing mechanisms, restore energy flow,
              and promote overall well-being.
            </motion.p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              {marmaPoints.map((point, index) => (
                <motion.div
                  key={point.name}
                  className="card group"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-3xl mb-3">📍</div>
                  <h3 className="text-xl font-bold text-blue-400 mb-2">{point.name}</h3>
                  <p className="text-sm text-slate-400 mb-3">{point.location}</p>
                  <p className="text-slate-300">{point.benefit}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Ancient Techniques */}
        <motion.section
          className="mb-20"
          variants={itemVariants}
        >
          <div className="glass-strong rounded-3xl p-8 md:p-12">
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-6 gradient-text text-center"
              variants={itemVariants}
            >
              Ancient Healing Techniques
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                className="text-center"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-5xl mb-4">🧘</div>
                <h3 className="text-2xl font-bold text-blue-400 mb-3">Energy Flow</h3>
                <p className="text-slate-300">
                  Marma therapy works by balancing the flow of Prana (life force energy) through the body's
                  energy channels, restoring harmony and vitality.
                </p>
              </motion.div>
              <motion.div
                className="text-center"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-5xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold text-indigo-400 mb-3">Precise Stimulation</h3>
                <p className="text-slate-300">
                  Our IoT technology ensures accurate pressure application at the exact marma points,
                  combining ancient wisdom with modern precision.
                </p>
              </motion.div>
              <motion.div
                className="text-center"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-5xl mb-4">🌿</div>
                <h3 className="text-2xl font-bold text-purple-400 mb-3">Holistic Healing</h3>
                <p className="text-slate-300">
                  Marma therapy addresses the root cause of imbalances, promoting natural healing
                  from within rather than just treating symptoms.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Ancient Quotes */}
        <motion.section
          className="mb-20"
          variants={itemVariants}
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-12 gradient-text text-center"
            variants={itemVariants}
          >
            Wisdom of the Ancients
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {ancientQuotes.map((quote, index) => (
              <motion.div
                key={index}
                className="glass rounded-3xl p-8 relative overflow-hidden"
                variants={quoteVariants}
                whileHover={{ scale: 1.03, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute top-0 right-0 text-6xl opacity-10">"</div>
                <p className="text-lg text-slate-200 italic mb-6 relative z-10 leading-relaxed">
                  "{quote.text}"
                </p>
                <div className="border-t border-white/10 pt-4 relative z-10">
                  <p className="font-bold text-blue-400">{quote.author}</p>
                  <p className="text-sm text-slate-400">{quote.period}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.div
          className="text-center"
          variants={itemVariants}
        >
          <div className="glass-strong rounded-3xl p-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              Ready to Begin Your Healing Journey?
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Connect with certified Ayurvedic doctors and experience the transformative power
              of Marma Point Therapy in the comfort of your home.
            </p>
            <Link
              to="/signup"
              className="btn btn-primary text-lg px-10 py-5 inline-block glow"
            >
              <span className="relative z-10">Get Started Today</span>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
